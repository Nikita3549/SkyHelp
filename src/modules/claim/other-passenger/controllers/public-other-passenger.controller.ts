import {
    BadRequestException,
    Body,
    Controller,
    NotFoundException,
    Param,
    Post,
    Query,
    UnauthorizedException,
    UploadedFiles,
} from '@nestjs/common';
import { OtherPassengerService } from '../other-passenger.service';
import { DocumentService } from '../../document/services/document.service';
import { ClaimService } from '../../claim.service';
import { TokenService } from '../../../token/token.service';
import { RecentUpdatesService } from '../../recent-updates/recent-updates.service';
import { DocumentRequestService } from '../../document-request/document-request.service';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';
import { UploadSignDto } from '../../customer/dto/upload-sign.dto';
import {
    CLAIM_NOT_FOUND,
    INVALID_JWT,
    PASSENGER_NOT_FOUND,
} from '../../constants';
import { ClaimRecentUpdatesType, DocumentRequestStatus } from '@prisma/client';
import { JwtQueryDto } from '../../dto/jwt-query.dto';
import { CreateOtherPassengersDto } from '../dto/create-other-passengers.dto';
import { validateClaimJwt } from '../../../../common/utils/validate-claim-jwt';
import { DocumentsUploadInterceptor } from '../../../../common/interceptors/documents/documents-upload.interceptor';
import { UploadOtherPassengerDto } from '../dto/upload-other-passenger.dto';

@Controller('claims/passengers')
export class PublicOtherPassengerController {
    constructor(
        private readonly otherPassengerService: OtherPassengerService,
        private readonly documentService: DocumentService,
        private readonly tokenService: TokenService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly documentRequestService: DocumentRequestService,
        private readonly claimPersistenceService: ClaimPersistenceService,
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

        const claim = await this.claimPersistenceService.findOneById(
            passenger.claimId,
        );

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

        await this.documentService.saveSignature(
            {
                imageDataUrl: signature,
            },
            {
                claim: claim,
                passenger: { ...passenger, isCustomer: false },
            },
            {
                saveRecentUpdate: true,
                checkIfAllDocumentsUploaded: true,
                isParental: passenger.isMinor,
            },
        );

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

        const claim = await this.claimPersistenceService.findOneById(claimId);

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

        const claim = await this.claimPersistenceService.findOneById(claimId);

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
            {
                isPublic: true,
                handleIsAllDocumentsUploaded: true,
            },
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

        return documents;
    }
}
