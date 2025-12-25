import {
    BadRequestException,
    Body,
    Controller,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
    Query,
    UnauthorizedException,
    UploadedFiles,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { UpdatePassengerDto } from './dto/update-passenger.dto';
import {
    CLAIM_NOT_FOUND,
    CONTINUE_LINKS_EXP,
    INVALID_JWT,
    PASSENGER_NOT_FOUND,
} from '../constants';
import { OtherPassengerService } from './other-passenger.service';
import { DocumentService } from '../document/services/document.service';
import { ClaimService } from '../claim.service';
import { UploadSignDto } from '../customer/dto/upload-sign.dto';
import { JwtQueryDto } from '../dto/jwt-query.dto';
import { CreateOtherPassengersDto } from './dto/create-other-passengers.dto';
import { validateClaimJwt } from '../../../common/utils/validate-claim-jwt';
import { TokenService } from '../../token/token.service';
import {
    ClaimRecentUpdatesType,
    ClaimStatus,
    DocumentRequestStatus,
    DocumentType,
    PassengerPaymentStatus,
    UserRole,
} from '@prisma/client';
import { DocumentsUploadInterceptor } from '../../../common/interceptors/documents/documents-upload.interceptor';
import { UploadOtherPassengerDto } from './dto/upload-other-passenger.dto';
import { generateAssignmentName } from '../../../common/utils/generate-assignment-name';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import { DocumentRequestService } from '../document-request/document-request.service';
import { RoleGuard } from '../../../common/guards/role.guard';
import { UpdatePaymentStatusDto } from '../customer/dto/update-payment-status.dto';
import { Languages } from '../../language/enums/languages.enums';
import { GenerateLinksService } from '../../generate-links/generate-links.service';
import { NotificationService } from '../../notification/notification.service';

@Controller('claims/passengers')
@UseGuards(JwtAuthGuard)
export class OtherPassengerController {
    constructor(
        private readonly otherPassengerService: OtherPassengerService,
        private readonly tokenService: TokenService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly notificationService: NotificationService,
        private readonly claimService: ClaimService,
        private readonly documentService: DocumentService,
    ) {}

    @Patch(':passengerId/payment-status')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.AGENT,
            UserRole.LAWYER,
            UserRole.ACCOUNTANT,
        ]),
    )
    async updatePaymentStatus(
        @Param('passengerId') passengerId: string,
        @Body() dto: UpdatePaymentStatusDto,
    ) {
        const { paymentStatus } = dto;

        const passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        if (paymentStatus == PassengerPaymentStatus.FAILED) {
            const linkJwt = this.tokenService.generateJWT(
                {
                    claimId: passenger.claimId,
                },
                { expiresIn: CONTINUE_LINKS_EXP },
            );
            const claim = (await this.claimService.getClaim(
                passenger.claimId,
            ))!;

            const paymentDetailsLink =
                await this.generateLinksService.generatePaymentDetails(linkJwt);

            await this.notificationService.sendPaymentRequest(
                claim.customer.email,
                {
                    customerName: claim.customer.firstName,
                    claimId: claim.id,
                    paymentDetailsLink,
                },
                Languages.EN,
            );

            await this.claimService.updateStatus(
                ClaimStatus.PAYMENT_FAILED,
                claim.id,
            );
        }

        return await this.otherPassengerService.updatePaymentStatus(
            paymentStatus,
            passengerId,
        );
    }

    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    @Put('admin')
    async updateOtherPassenger(@Body() dto: UpdatePassengerDto) {
        const { passengerId } = dto;

        const passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new BadRequestException(PASSENGER_NOT_FOUND);
        }
        const claim = (await this.claimService.getClaim(passenger.claimId))!;

        const updatedPassenger =
            await this.otherPassengerService.updatePassenger(dto, passenger.id);
        await this.documentService.updateAssignmentData(claim.id, [
            ...claim.passengers.map((p) => p.id),
        ]);

        return updatedPassenger;
    }

    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    @Patch(`:passengerId/admin/minor`)
    async patchPassengerToMinor(@Param('passengerId') passengerId: string) {
        const passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        return await this.otherPassengerService.setOtherPassengerAsMinor(
            passenger.id,
        );
    }
}

@Controller('claims/passengers')
export class PublicOtherPassengerController {
    constructor(
        private readonly otherPassengerService: OtherPassengerService,
        private readonly documentService: DocumentService,
        private readonly claimService: ClaimService,
        private readonly tokenService: TokenService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly documentRequestService: DocumentRequestService,
    ) {}

    @Post(':passengerId/sign')
    async uploadOtherPassengerSign(
        @Body() dto: UploadSignDto,
        @Param('passengerId') passengerId: string,
    ) {
        const {
            signature,
            jwt,
            documentRequestId,
            parentFirstName,
            parentLastName,
        } = dto;

        const token = await this.tokenService.verifyJWT(jwt).catch((_e) => {
            throw new UnauthorizedException(INVALID_JWT);
        });

        await this.tokenService.revokeJwt(token);

        await this.tokenService.revokeJwt(token);

        let passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        const requireParentInfo =
            passenger.isMinor &&
            (!passenger.parentFirstName || !passenger.parentLastName);

        if (requireParentInfo) {
            if (!parentFirstName || !parentLastName) {
                throw new BadRequestException(
                    'This passenger needs parentFirstName and parentLastName for signing',
                );
            }

            passenger = await this.otherPassengerService.updatePassenger(
                {
                    parentFirstName,
                    parentLastName,
                },
                passenger.id,
            );
        }

        const claim = await this.claimService.getClaim(passenger.claimId);

        if (!claim) {
            return;
        }

        if (documentRequestId) {
            const documentRequest =
                await this.documentRequestService.getById(documentRequestId);

            if (documentRequest) {
                await this.documentRequestService.updateStatus(
                    documentRequestId,
                    DocumentRequestStatus.INACTIVE,
                );
            }
        }

        let file: { buffer: Buffer };
        const assignmentFileName = generateAssignmentName(
            passenger.firstName,
            passenger.lastName,
        );

        if (passenger.isMinor) {
            if (
                !passenger.birthday ||
                !passenger.parentFirstName ||
                !passenger.parentLastName
            ) {
                console.error(
                    `ERROR: Minor passenger ${passengerId} doesn't have birthday or parentFirstName or parentLastName field. Claim: ${claim.id}`,
                );
                throw new InternalServerErrorException();
            }

            file = await this.documentService.saveParentalSignaturePdf(
                {
                    imageDataUrl: signature,
                },
                {
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    flightNumber: claim.details.flightNumber,
                    date: claim.details.date,
                    address: passenger.address,
                    fileName: assignmentFileName,
                    claimId: claim.id,
                    airlineName: claim.details.airlines.name,
                    parentFirstName: passenger.parentFirstName,
                    parentLastName: passenger.parentLastName,
                    minorBirthday: passenger.birthday,
                },
            );
        } else {
            file = await this.documentService.saveSignaturePdf(
                {
                    imageDataUrl: signature,
                },
                {
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    flightNumber: claim.details.flightNumber,
                    date: claim.details.date,
                    address: passenger.address,
                    claimId: claim.id,
                    airlineName: claim.details.airlines.name,
                    fileName: assignmentFileName,
                },
            );
        }

        const documents = await this.documentService.saveDocuments(
            [
                {
                    name: assignmentFileName,
                    passengerId: passenger.id,
                    documentType: DocumentType.ASSIGNMENT,
                    buffer: file.buffer,
                    mimetype: 'application/pdf',
                },
            ],
            passenger.claimId,
            true,
        );

        documents.forEach((doc) => {
            this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.DOCUMENT,
                    updatedEntityId: doc.id,
                    entityData: doc.name,
                    documentType: doc.type,
                },
                passenger.claimId,
            );
        });

        await this.otherPassengerService.setIsSignedPassenger(
            passengerId,
            true,
        );

        await this.claimService.handleAllDocumentsUploaded(claim.id);
    }

    @Post()
    async createOtherPassengers(
        @Query() query: JwtQueryDto,
        @Body() dto: CreateOtherPassengersDto,
    ) {
        const { jwt } = query;
        const { claimId } = dto;

        await validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const passengers = dto.passengers;

        const today = new Date();
        passengers.map((p) => {
            let age = today.getFullYear() - p.birthday.getFullYear();
            const m = today.getMonth() - p.birthday.getMonth();

            if (m < 0 || (m === 0 && today.getDate() < p.birthday.getDate())) {
                age--;
            }
            if (age < 18) {
                return {
                    ...p,
                    isMinor: true,
                };
            }

            return p;
        });

        return this.otherPassengerService.createOtherPassengers(
            passengers,
            claimId,
            claim.customer.compensation,
        );
    }

    @Post('upload')
    @DocumentsUploadInterceptor()
    async uploadOtherPassengerDocument(
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Body() dto: UploadOtherPassengerDto,
    ) {
        const { claimId, documentTypes, jwt, passengerId } = dto;

        const token = await validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        await this.tokenService.revokeJwt(token);

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const documents = await this.documentService.saveDocuments(
            files.map((doc, index) => {
                return {
                    name: doc.originalname,
                    passengerId,
                    documentType: documentTypes[index],
                    buffer: doc.buffer,
                    mimetype: doc.mimetype,
                };
            }),
            claimId,
            true,
        );

        documents.forEach((doc) => {
            this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.DOCUMENT,
                    updatedEntityId: doc.id,
                    entityData: doc.name,
                    documentType: doc.type,
                },
                claimId,
            );
        });

        await this.claimService.handleAllDocumentsUploaded(claim.id);

        return documents;
    }
}
