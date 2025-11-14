import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    NotFoundException,
    Post,
    Put,
    Query,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { UpdateAdminPaymentDto } from './dto/update-admin-payment.dto';
import {
    CLAIM_NOT_FOUND,
    INVALID_JWT,
    PAYMENT_DETAILS_ALREADY_REQUESTED,
} from '../constants';
import { PaymentService } from './payment.service';
import { ClaimService } from '../claim.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../../guards/role.guard';
import { RequestPaymentDetailsDto } from './dto/request-payment-details.dto';
import { Languages } from '../../language/enums/languages.enums';
import { JwtQueryDto } from '../dto/jwt-query.dto';
import { TokenService } from '../../token/token.service';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { omit } from '../../../utils/omit';

@Controller('claims/payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly tokenService: TokenService,
        private readonly claimService: ClaimService,
    ) {}

    @Post()
    async addPayment(
        @Body() dto: UpdatePaymentDto,
        @Query() query: JwtQueryDto,
    ) {
        const { jwt } = query;

        const payload = await this.tokenService.verifyJWT(jwt);

        if (!payload || !payload?.claimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }
        await this.tokenService.revokeJwt(payload);

        await this.claimService.changeUpdatedAt(payload.claimId);

        return await this.paymentService.updatePayment(dto, payload.claimId);
    }

    @Put('admin')
    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    async updateAdminPayment(@Body() dto: UpdateAdminPaymentDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        await this.claimService.changeUpdatedAt(claimId);

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

        const claim = await this.claimService.getClaim(claimId);

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

        await this.claimService.updateIsPaymentRequested(true, claimId);
    }
}
