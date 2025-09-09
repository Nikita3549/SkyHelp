import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Put,
    Query,
    UploadedFiles,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { UpdatePassengerDto } from './dto/update-passenger.dto';
import { CLAIM_NOT_FOUND, INVALID_PASSENGER_ID } from '../constants';
import { OtherPassengerService } from './other-passenger.service';
import { DocumentService } from '../document/document.service';
import { ClaimService } from '../claim.service';
import { UploadSignDto } from '../customer/dto/upload-sign.dto';
import { JwtQueryDto } from '../dto/jwt-query.dto';
import { CreateOtherPassengersDto } from './dto/create-other-passengers.dto';
import { validateClaimJwt } from '../../../utils/validate-claim-jwt';
import { TokenService } from '../../token/token.service';
import { ClaimRecentUpdatesType, DocumentType } from '@prisma/client';
import { DocumentsUploadInterceptor } from '../../../interceptors/documents/documents-upload.interceptor';
import { UploadOtherPassengerDto } from './dto/upload-other-passenger.dto';
import { IsAgentGuard } from '../../../guards/isAgent.guard';
import { generateAssignmentName } from '../../../utils/generate-assignment-name';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';

@Controller('claims/passengers')
@UseGuards(JwtAuthGuard)
export class OtherPassengerController {
    constructor(
        private readonly otherPassengerService: OtherPassengerService,
    ) {}

    @UseGuards(IsAgentGuard)
    @Put('admin')
    async updateOtherPassenger(@Body() dto: UpdatePassengerDto) {
        const { passengerId } = dto;

        if (
            !(await this.otherPassengerService.getOtherPassenger(passengerId))
        ) {
            throw new BadRequestException(INVALID_PASSENGER_ID);
        }

        return await this.otherPassengerService.updatePassenger(
            dto,
            passengerId,
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
    ) {}

    @Get(':passengerId')
    async getOtherPassenger(@Param('passengerId') passengerId: string) {
        const passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(INVALID_PASSENGER_ID);
        }

        return passenger;
    }

    @Post(':passengerId/sign')
    async uploadOtherPassengerSign(
        @Body() dto: UploadSignDto,
        @Param('passengerId') passengerId: string,
    ) {
        const { signature, claimId, jwt } = dto;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const passenger =
            await this.otherPassengerService.getOtherPassenger(passengerId);

        if (!passenger) {
            throw new NotFoundException(INVALID_PASSENGER_ID);
        }

        const claim = await this.claimService.getClaim(passenger.claimId);

        if (!claim) {
            return;
        }

        const path = await this.documentService.saveSignaturePdf(signature, {
            firstName: passenger.firstName,
            lastName: passenger.lastName,
            flightNumber: claim.details.flightNumber,
            date: claim.details.date,
            address: passenger.address,
            claimId: claim.id,
            airlineName: claim.details.airlines.name,
        });

        const documents = await this.documentService.saveDocuments(
            [
                {
                    path,
                    name: generateAssignmentName(
                        passenger.firstName,
                        passenger.lastName,
                    ),
                },
            ],
            claimId,
            DocumentType.ASSIGNMENT,
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

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const passengers = dto.passengers;

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
        const { claimId, documentType, jwt } = dto;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const documents = await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
            documentType,
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
