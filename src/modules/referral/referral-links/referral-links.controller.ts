import {
    Body,
    ConflictException,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { ReferralLinksService } from './referral-links.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { Partner, UserRole } from '@prisma/client';
import { CreateReferralLinkDto } from './dto/create-referral-link.dto';
import { PartnerService } from '../partner/partner.service';
import {
    HAVE_NO_RIGHTS_ON_PARTNER_DATA,
    PARTNER_NOT_FOUND,
} from '../partner/constants';
import { SaveReferralLinkClickDto } from './dto/save-referral-link-click.dto';
import { GetReferralLinksDto } from './dto/get-referral-links.dto';
import { REFERRAL_LINK_NOT_FOUND } from './constants';
import { RoleGuard } from '../../../guards/role.guard';

@Controller('referral-links')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([UserRole.ADMIN, UserRole.PARTNER, UserRole.AFFILIATE]),
)
export class ReferralLinksController {
    constructor(
        private readonly referralLinkService: ReferralLinksService,
        private readonly partnerService: PartnerService,
    ) {}

    @Get()
    async getReferralLinks(
        @Req() req: AuthRequest,
        @Query() query: GetReferralLinksDto,
    ) {
        const userId =
            req.user.role == UserRole.ADMIN ? query.userId : req.user.id;

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
            referralCode: partner.referralCode,
            partnerId: partner.id,
            path: `/?ref=${referralCode}&ref_source=${source}`,
        });
    }

    @Delete(':referralLinkId')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteReferralLink(
        @Param('referralLinkId') referralLinkId: string,
        @Req() req: AuthRequest,
    ) {
        const referralLink =
            await this.referralLinkService.getReferralLinkById(referralLinkId);

        if (!referralLink) {
            throw new NotFoundException(REFERRAL_LINK_NOT_FOUND);
        }

        if (
            req.user.role != UserRole.ADMIN &&
            req.user.id != referralLink.partner.userId
        ) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_PARTNER_DATA);
        }

        await this.referralLinkService.deleteReferralLink(referralLink.id);
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
