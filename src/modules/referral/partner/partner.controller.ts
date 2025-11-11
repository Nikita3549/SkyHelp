import {
    BadRequestException,
    Body,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { PartnerService } from './partner.service';
import { HAVE_NO_RIGHTS_ON_PARTNER_DATA, PARTNER_NOT_FOUND } from './constants';
import { UserRole } from '@prisma/client';
import { GetPartnersStatsDto } from './dto/get-partners-stats.dto';
import { UpdatePartnerPaymentDto } from './dto/update-partner-payment.dto';
import { RoleGuard } from '../../../guards/role.guard';

@Controller('partner')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([UserRole.ADMIN, UserRole.PARTNER, UserRole.AFFILIATE]),
)
export class PartnerController {
    constructor(private readonly partnerService: PartnerService) {}

    @Put(':userId/payment')
    @HttpCode(HttpStatus.NO_CONTENT)
    async updatePartnerPayment(
        @Body() dto: UpdatePartnerPaymentDto,
        @Req() req: AuthRequest,
        @Param('userId') userId: string,
    ) {
        const partner = await this.partnerService.getPartnerByUserId(userId);

        if (!partner || req.user.id == userId) {
            throw new NotFoundException(PARTNER_NOT_FOUND);
        }

        await this.partnerService.updatePartnerPayment(dto, userId);
    }

    @Get(':userId')
    async getPartner(@Param('userId') userId: string, @Req() req: AuthRequest) {
        const partner = await this.partnerService.getPartnerByUserId(userId);

        if (!partner) {
            throw new NotFoundException(PARTNER_NOT_FOUND);
        }

        if (req.user.role != UserRole.ADMIN && req.user.id != partner.userId) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_PARTNER_DATA);
        }

        return partner;
    }

    @Get(':userId/stats')
    async getPartnersStats(
        @Param('userId') userId: string,
        @Req() req: AuthRequest,
        @Query() query: GetPartnersStatsDto,
    ) {
        const { referralCode, referralSource } = query;

        if (
            (!referralCode && referralSource) ||
            (referralCode && !referralSource)
        ) {
            throw new BadRequestException(
                'You must provide both referralCode and referralSource or neither',
            );
        }

        if (req.user.role != UserRole.ADMIN && req.user.id != userId) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_PARTNER_DATA);
        }

        const partner = await this.partnerService.getPartnerByUserId(userId);

        if (!partner) {
            throw new NotFoundException(PARTNER_NOT_FOUND);
        }

        return await this.partnerService.getPartnerStats(userId, {
            partnerData:
                referralSource && referralCode
                    ? {
                          referralSource,
                          referralCode,
                      }
                    : undefined,
        });
    }
}
