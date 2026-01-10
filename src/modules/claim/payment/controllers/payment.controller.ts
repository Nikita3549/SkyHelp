import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    NotFoundException,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { UpdateAdminPaymentDto } from '../dto/update-admin-payment.dto';
import {
    CLAIM_NOT_FOUND,
    PAYMENT_DETAILS_ALREADY_REQUESTED,
} from '../../constants';
import { PaymentService } from '../payment.service';
import { JwtAuthGuard } from '../../../../common/guards/jwtAuth.guard';
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { RequestPaymentDetailsDto } from '../dto/request-payment-details.dto';
import { Languages } from '../../../language/enums/languages.enums';
import { omit } from '../../../../common/utils/omit';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';

@Controller('claims/payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @Put('admin')
    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    async updateAdminPayment(@Body() dto: UpdateAdminPaymentDto) {
        const { claimId } = dto;

        if (!(await this.claimPersistenceService.findOneById(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        await this.claimPersistenceService.update(
            { updatedAt: new Date() },
            claimId,
        );

        return await this.paymentService.updatePayment(
            omit(dto, 'claimId'),
            claimId,
        );
    }

    @Post('admin/details-request')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.AGENT,
            UserRole.ACCOUNTANT,
            UserRole.LAWYER,
        ]),
    )
    async requestPaymentDetails(@Body() dto: RequestPaymentDetailsDto) {
        const { claimId } = dto;

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }
        if (claim.state.isPaymentRequested) {
            throw new ForbiddenException(PAYMENT_DETAILS_ALREADY_REQUESTED);
        }

        await this.paymentService.schedulePaymentDetailsRequests({
            claimId: claim.id,
            customerLanguage: claim.customer.language as Languages,
            customerName: claim.customer.firstName,
            customerEmail: claim.customer.email,
        });

        await this.claimPersistenceService.updateIsPaymentRequested(
            { isPaymentRequested: true },
            claimId,
        );
    }
}
