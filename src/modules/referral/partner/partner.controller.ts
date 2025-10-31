import {
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsPartnerGuard } from '../../../guards/isPartnerGuard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { PartnerService } from './partner.service';
import { HAVE_NO_RIGHTS_ON_PARTNER_DATA, PARTNER_NOT_FOUND } from './constants';
import { UserRole } from '@prisma/client';

@Controller('partner')
@UseGuards(JwtAuthGuard, IsPartnerGuard)
export class PartnerController {
    constructor(private readonly partnerService: PartnerService) {}

    @Get(':partnerId')
    async getPartner(
        @Param('partnerId') partnerId: string,
        @Req() req: AuthRequest,
    ) {
        const partner = await this.partnerService.getPartnerById(partnerId);

        if (!partner) {
            throw new NotFoundException(PARTNER_NOT_FOUND);
        }

        if (req.user.role != UserRole.ADMIN && req.user.id != partner.userId) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_PARTNER_DATA);
        }

        return partner;
    }
}
