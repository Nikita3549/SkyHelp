import {
    BadRequestException,
    Body,
    Controller,
    Get,
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
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { UpdatePassengerDto } from './dto/update-passenger.dto';
import {
    CLAIM_NOT_FOUND,
    INVALID_JWT,
    PASSENGER_NOT_FOUND,
} from '../constants';
import { OtherPassengerService } from './other-passenger.service';
import { DocumentService } from '../document/document.service';
import { ClaimService } from '../claim.service';
import { UploadSignDto } from '../customer/dto/upload-sign.dto';
import { JwtQueryDto } from '../dto/jwt-query.dto';
import { CreateOtherPassengersDto } from './dto/create-other-passengers.dto';
import { validateClaimJwt } from '../../../utils/validate-claim-jwt';
import { TokenService } from '../../token/token.service';
import {
    ClaimRecentUpdatesType,
    DocumentRequestStatus,
    DocumentType,
    UserRole,
} from '@prisma/client';
import { DocumentsUploadInterceptor } from '../../../interceptors/documents/documents-upload.interceptor';
import { UploadOtherPassengerDto } from './dto/upload-other-passenger.dto';
import { generateAssignmentName } from '../../../utils/generate-assignment-name';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import { DocumentRequestService } from '../document-request/document-request.service';
import { RoleGuard } from '../../../guards/role.guard';

@Controller('claims/passengers')
@UseGuards(JwtAuthGuard)
export class OtherPassengerController {
    constructor(
        private readonly otherPassengerService: OtherPassengerService,
    ) {}

    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    @Put('admin')
    async updateOtherPassenger(@Body() dto: UpdatePassengerDto) {
        const { passengerId } = dto;

        if (
            !(await this.otherPassengerService.getOtherPassenger(passengerId))
        ) {
            throw new BadRequestException(PASSENGER_NOT_FOUND);
        }

        return await this.otherPassengerService.updatePassenger(
            dto,
            passengerId,
        );
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

        let path: string;

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

            path = await this.documentService.saveParentalSignaturePdf(
                signature,
                {
                    firstName: passenger.firstName,
                    lastName: passenger.lastName,
                    flightNumber: claim.details.flightNumber,
                    date: claim.details.date,
                    address: passenger.address,
                    claimId: claim.id,
                    airlineName: claim.details.airlines.name,
                    parentFirstName: passenger.parentFirstName,
                    parentLastName: passenger.parentLastName,
                    minorBirthday: passenger.birthday,
                },
            );
        } else {
            path = await this.documentService.saveSignaturePdf(signature, {
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                flightNumber: claim.details.flightNumber,
                date: claim.details.date,
                address: passenger.address,
                claimId: claim.id,
                airlineName: claim.details.airlines.name,
            });
        }

        const documents = await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: generateAssignmentName(
                        passenger.firstName,
                        passenger.lastName,
                    ),
                    passengerId: passenger.id,
                    documentType: DocumentType.ASSIGNMENT,
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
                },
                passenger.claimId,
            );
        });

        await this.otherPassengerService.setIsSignedPassenger(
            passengerId,
            true,
        );
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
                    path: doc.path,
                    passengerId,
                    documentType: documentTypes[index],
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
                },
                claimId,
            );
        });

        return documents;
    }
}
