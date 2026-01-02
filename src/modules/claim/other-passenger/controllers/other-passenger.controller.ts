import {
    BadRequestException,
    Body,
    Controller,
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
import { JwtAuthGuard } from '../../../../common/guards/jwtAuth.guard';
import { UpdatePassengerDto } from '../dto/update-passenger.dto';
import {
    CLAIM_NOT_FOUND,
    CONTINUE_LINKS_EXP,
    INVALID_JWT,
    PASSENGER_NOT_FOUND,
} from '../../constants';
import { OtherPassengerService } from '../other-passenger.service';
import { DocumentService } from '../../document/services/document.service';
import { ClaimService } from '../../claim.service';
import { UploadSignDto } from '../../customer/dto/upload-sign.dto';
import { JwtQueryDto } from '../../dto/jwt-query.dto';
import { CreateOtherPassengersDto } from '../dto/create-other-passengers.dto';
import { validateClaimJwt } from '../../../../common/utils/validate-claim-jwt';
import { TokenService } from '../../../token/token.service';
import {
    ClaimRecentUpdatesType,
    ClaimStatus,
    DocumentRequestStatus,
    PassengerPaymentStatus,
    UserRole,
} from '@prisma/client';
import { DocumentsUploadInterceptor } from '../../../../common/interceptors/documents/documents-upload.interceptor';
import { UploadOtherPassengerDto } from '../dto/upload-other-passenger.dto';
import { RecentUpdatesService } from '../../recent-updates/recent-updates.service';
import { DocumentRequestService } from '../../document-request/document-request.service';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { UpdatePaymentStatusDto } from '../../customer/dto/update-payment-status.dto';
import { Languages } from '../../../language/enums/languages.enums';
import { GenerateLinksService } from '../../../generate-links/generate-links.service';
import { NotificationService } from '../../../notification/services/notification.service';
import { PaymentRequestLetter } from '../../../notification/letters/definitions/claim/payment-request.letter';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';

@Controller('claims/passengers')
@UseGuards(JwtAuthGuard)
export class OtherPassengerController {
    constructor(
        private readonly otherPassengerService: OtherPassengerService,
        private readonly tokenService: TokenService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly notificationService: NotificationService,
        private readonly documentService: DocumentService,
        private readonly claimPersistenceService: ClaimPersistenceService,
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
            const claim = (await this.claimPersistenceService.findOneById(
                passenger.claimId,
            ))!;

            const paymentDetailsLink =
                await this.generateLinksService.generatePaymentDetails(linkJwt);

            await this.notificationService.sendLetter(
                new PaymentRequestLetter({
                    to: claim.customer.email,
                    customerName: claim.customer.firstName,
                    claimId: claim.id,
                    paymentDetailsLink,
                    language: claim.customer.language as Languages,
                }),
            );

            await this.claimPersistenceService.updateStatus(
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
        const claim = (await this.claimPersistenceService.findOneById(
            passenger.claimId,
        ))!;

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
