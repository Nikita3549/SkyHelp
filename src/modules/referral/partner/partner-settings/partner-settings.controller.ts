import {
    Body,
    Controller,
    ForbiddenException,
    NotFoundException,
    Param,
    Put,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../guards/jwtAuth.guard';
import { IsPartnerOrAffiliateGuard } from '../../../../guards/isPartnerOrAffiliateGuard';
import { UpdatePartnerSettingsDto } from './dto/update-partner-settings.dto';
import { PartnerSettingsService } from './partner-settings.service';
import { AuthRequest } from '../../../../interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';
import { PartnerService } from '../partner.service';
import {
    HAVE_NO_RIGHTS_ON_PARTNER_DATA,
    PARTNER_NOT_FOUND,
} from '../constants';

@Controller('partner/:userId/settings')
@UseGuards(JwtAuthGuard, IsPartnerOrAffiliateGuard)
export class PartnerSettingsController {
    constructor(
        private readonly partnerSettingsService: PartnerSettingsService,
        private readonly partnerService: PartnerService,
    ) {}

    @Put()
    async updatePartnerSettings(
        @Body() dto: UpdatePartnerSettingsDto,
        @Param(':userId') userId: string,
        @Req() req: AuthRequest,
    ) {
        if (req.user.role != UserRole.ADMIN) {
            if (req.user.id != userId) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_PARTNER_DATA);
            }
        } else {
            const partner =
                await this.partnerService.getPartnerByUserId(userId);

            if (!partner) {
                throw new NotFoundException(PARTNER_NOT_FOUND);
            }
        }

        return await this.partnerSettingsService.updatePartnerSettings(
            dto,
            userId,
        );
    }
}
