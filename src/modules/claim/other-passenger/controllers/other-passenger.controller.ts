import {
    BadRequestException,
    Body,
    Controller,
    NotFoundException,
    Param,
    Patch,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwtAuth.guard';
import { UpdatePassengerDto } from '../dto/update-passenger.dto';
import {
    CLAIM_NOT_FOUND,
    CONTINUE_LINKS_EXP,
    PASSENGER_NOT_FOUND,
} from '../../constants';
import { OtherPassengerService } from '../other-passenger.service';
import { DocumentService } from '../../document/services/document.service';
import { TokenService } from '../../../token/token.service';
import { ClaimStatus, PassengerPaymentStatus, UserRole } from '@prisma/client';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { UpdatePaymentStatusDto } from '../../customer/dto/update-payment-status.dto';
import { Languages } from '../../../language/enums/languages.enums';
import { GenerateLinksService } from '../../../generate-links/generate-links.service';
import { NotificationService } from '../../../notification/services/notification.service';
import { PaymentRequestLetter } from '../../../notification/letters/definitions/claim/payment-request.letter';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';
import { DiscrepancyPersistenceService } from '../../discrepancy-hub/services/discrepancy-persistence.service';

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
        private readonly discrepancyPersistenceService: DiscrepancyPersistenceService,
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

        const claim = await this.claimPersistenceService.findOneById(
            passenger.claimId,
        );

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        if (paymentStatus == PassengerPaymentStatus.FAILED) {
            const linkJwt = this.tokenService.generateJWT(
                {
                    claimId: passenger.claimId,
                },
                { expiresIn: CONTINUE_LINKS_EXP },
            );

            const paymentDetailsLink =
                await this.generateLinksService.paymentDetails(linkJwt);

            await this.notificationService.sendLetter(
                new PaymentRequestLetter({
                    to: claim.customer.email,
                    customerName: claim.customer.firstName,
                    claimId: claim.id,
                    paymentDetailsLink,
                    language: claim.customer.language as Languages,
                }),
            );

            await this.claimPersistenceService.updateStatus({
                newStatus: ClaimStatus.PAYMENT_FAILED,
                passengerId: passenger.id,
                claimId: claim.id,
            });
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

        const claim = await this.claimPersistenceService.findOneById(
            passenger.claimId,
        );

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

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
