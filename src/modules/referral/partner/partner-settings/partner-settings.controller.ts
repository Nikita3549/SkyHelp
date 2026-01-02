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
import { JwtAuthGuard } from '../../../../common/guards/jwtAuth.guard';
import { UpdatePartnerSettingsDto } from './dto/update-partner-settings.dto';
import { PartnerSettingsService } from './partner-settings.service';
import { AuthRequest } from '../../../../common/interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';
import { PartnerService } from '../partner.service';
import {
    HAVE_NO_RIGHTS_ON_PARTNER_DATA,
    PARTNER_NOT_FOUND,
} from '../constants';
import { RoleGuard } from '../../../../common/guards/role.guard';

@Controller('partner/:userId/settings')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([UserRole.ADMIN, UserRole.PARTNER, UserRole.AFFILIATE]),
)
export class PartnerSettingsController {
    constructor(
        private readonly partnerSettingsService: PartnerSettingsService,
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
        }

        return await this.partnerSettingsService
            .updatePartnerSettings(dto, userId)
            .catch((e) => {
                throw new NotFoundException(PARTNER_NOT_FOUND);
            });
    }
}
