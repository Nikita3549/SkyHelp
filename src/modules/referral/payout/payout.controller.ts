import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsAdminGuard } from '../../../guards/isAdminGuard';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { PartnerService } from '../partner/partner.service';
import { PARTNER_NOT_FOUND } from '../partner/constants';
import { PayoutService } from './payout.service';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { Prisma, UserRole } from '@prisma/client';
import { IsPartnerOrAffiliateGuard } from '../../../guards/isPartnerOrAffiliateGuard';

@Controller('payout')
@UseGuards(JwtAuthGuard)
export class PayoutController {
    constructor(
        private readonly partnerService: PartnerService,
        private readonly payoutService: PayoutService,
    ) {}

    @Post()
    @UseGuards(IsAdminGuard)
    async createPayout(@Body() dto: CreatePayoutDto) {
        let { amount, userId } = dto;

        const partner = await this.partnerService.getPartnerByUserId(userId);

        if (!partner) {
            throw new NotFoundException(PARTNER_NOT_FOUND);
        }

        const decimalAmount = new Prisma.Decimal(amount);

        if (decimalAmount.gt(partner.balance)) {
            throw new BadRequestException('Insufficient balance');
        }
        return await this.payoutService.makePayout({
            amount,
            partnerId: partner.id,
        });
    }

    @Get()
    @UseGuards(IsPartnerOrAffiliateGuard)
    async getPayouts(@Req() req: AuthRequest) {
        const userId =
            req.user.role == UserRole.ADMIN ? undefined : req.user.id;

        return this.payoutService.getPayouts({
            userId,
        });
    }
}
