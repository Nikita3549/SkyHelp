import {
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
import { UserRole } from '@prisma/client';
import { IsPartnerGuard } from '../../../guards/isPartnerGuard';

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
        const { amount, partnerId } = dto;

        const partner = await this.partnerService.getPartnerById(partnerId);

        if (!partner) {
            throw new NotFoundException(PARTNER_NOT_FOUND);
        }

        return await this.payoutService.makePayout({ amount, partnerId });
    }

    @Get()
    @UseGuards(IsPartnerGuard)
    async getPayouts(@Req() req: AuthRequest) {
        const userId =
            req.user.role == UserRole.ADMIN ? undefined : req.user.id;

        return this.payoutService.getPayouts({
            userId,
        });
    }
}
