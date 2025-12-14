import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { CreatePayoutDto } from './dto/create-payout.dto';
import { PartnerService } from '../partner/partner.service';
import { PARTNER_NOT_FOUND } from '../partner/constants';
import { PayoutService } from './payout.service';
import { AuthRequest } from '../../../common/interfaces/AuthRequest.interface';
import { Prisma, UserRole } from '@prisma/client';
import { RoleGuard } from '../../../common/guards/role.guard';
import { GetPayoutsDto } from './dto/get-payouts.dto';

@Controller('payout')
@UseGuards(JwtAuthGuard)
export class PayoutController {
    constructor(
        private readonly partnerService: PartnerService,
        private readonly payoutService: PayoutService,
    ) {}

    @Post()
    @UseGuards(new RoleGuard([UserRole.ADMIN]))
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
    @UseGuards(
        new RoleGuard([UserRole.ADMIN, UserRole.PARTNER, UserRole.AFFILIATE]),
    )
    async getPayouts(@Req() req: AuthRequest, @Query() dto: GetPayoutsDto) {
        const userId =
            req.user.role == UserRole.ADMIN ? dto.userId : req.user.id;

        return this.payoutService.getPayouts({
            userId,
        });
    }
}
