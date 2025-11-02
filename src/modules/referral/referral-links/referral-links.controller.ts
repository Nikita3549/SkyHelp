import {
    Body,
    ConflictException,
    Controller,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ReferralLinksService } from './referral-links.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsPartnerGuard } from '../../../guards/isPartnerGuard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { Partner, UserRole } from '@prisma/client';
import { CreateReferralLinkDto } from './dto/create-referral-link.dto';
import { PartnerService } from '../partner/partner.service';
import { PARTNER_NOT_FOUND } from '../partner/constants';
import { SaveReferralLinkClickDto } from './dto/save-referral-link-click.dto';

@Controller('referral-links')
@UseGuards(JwtAuthGuard, IsPartnerGuard)
export class ReferralLinksController {
    constructor(
        private readonly referralLinkService: ReferralLinksService,
        private readonly partnerService: PartnerService,
    ) {}

    @Get()
    async getReferralLinks(@Req() req: AuthRequest) {
        const userId =
            req.user.role == UserRole.ADMIN ? undefined : req.user.id;

        return this.referralLinkService.getReferralLinks(userId);
    }

    @Post()
    async createReferralLink(
        @Body() dto: CreateReferralLinkDto,
        @Req() req: AuthRequest,
    ) {
        let { source, referralCode } = dto;
        let partner: Partner;

        if (req.user.role == UserRole.ADMIN) {
            const dbPartner =
                await this.partnerService.getPartnerByReferralCode(
                    referralCode,
                );

            if (!dbPartner) {
                throw new NotFoundException(PARTNER_NOT_FOUND);
            }

            partner = dbPartner;
        } else {
            const dbPartner = await this.partnerService.getPartnerByUserId(
                req.user.id,
            );

            if (!dbPartner) {
                console.error(
                    `User ${req.user.id} has PARTNER role but doesn't have partnerId`,
                );
                throw new ForbiddenException(PARTNER_NOT_FOUND);
            }

            referralCode = dbPartner.referralCode;
            partner = dbPartner;
        }

        const referralLink = await this.referralLinkService.getReferralLink(
            source,
            referralCode,
        );

        if (referralLink) {
            throw new ConflictException('Link already exists');
        }

        return await this.referralLinkService.createReferralLinks({
            source,
            referralCode,
            partnerId: partner.id,
            path: `/?ref=${referralCode}&ref_source=${source}`,
        });
    }
}

@Controller('referral-links')
export class PublicReferralLinksController {
    constructor(private readonly referralLinkService: ReferralLinksService) {}

    @Post('clicks')
    @HttpCode(HttpStatus.NO_CONTENT)
    async saveClick(@Body() dto: SaveReferralLinkClickDto) {
        const { referralCode, source } = dto;

        await this.referralLinkService.saveReferralClick(referralCode, source);
    }
}
