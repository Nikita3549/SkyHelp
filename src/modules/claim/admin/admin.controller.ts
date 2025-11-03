import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    HttpStatus,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { IsAdminGuard } from '../../../guards/isAdminGuard';
import { GetClaimsQuery, IsYesOrNo } from './dto/get-claims.query';
import { ArchiveClaimDto } from './dto/archive-claim.dto';
import { HAVE_NO_RIGHTS_ON_CLAIM, CLAIM_NOT_FOUND } from '../constants';
import { UpdateClaimDto } from '../dto/update-claim.dto';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { ClaimService } from '../claim.service';
import { AddAgentDto } from './dto/add-agent.dto';
import { UserService } from '../../user/user.service';
import { UserRole } from '@prisma/client';
import { AGENT_NOT_FOUND } from './constants';
import { IsAgentOrLawyerGuardOrPartner } from '../../../guards/isAgentOrLawyerGuardOrPartner';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { IsAgentGuard } from '../../../guards/isAgent.guard';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import { GetAdminClaimsStatsQuery } from './dto/get-admin-claims-stats.query';
import { DeleteDuplicatesDto } from './dto/delete-duplicates.dto';
import { PartnerService } from '../../referral/partner/partner.service';
import { CreatePartnerDto } from './dto/create-partner.dto';

@Controller('claims/admin')
@UseGuards(JwtAuthGuard, IsAgentOrLawyerGuardOrPartner)
export class AdminController {
    constructor(
        private readonly claimService: ClaimService,
        private readonly userService: UserService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly partnerService: PartnerService,
    ) {}

    @Post('partner')
    @UseGuards(IsAdminGuard)
    async createPartner(@Body() dto: CreatePartnerDto) {
        const { referralCode, userId } = dto;

        const user = await this.userService.getUserById(userId);

        if (!user || user?.role == UserRole.PARTNER) {
            return;
        }

        const partner = await this.partnerService.getPartnerByUserId(userId);

        if (partner) {
            return partner;
        }

        await this.userService.updateRole(UserRole.PARTNER, user.id);

        return await this.partnerService.createPartner({
            userId,
            referralCode,
            userEmail: user.email,
        });
    }

    @Delete('duplicate')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteDuplicates(@Body() dto: DeleteDuplicatesDto) {
        const { claimIds } = dto;

        await this.claimService.deleteDuplicates(claimIds);
    }

    @Get()
    async getClaims(@Query() query: GetClaimsQuery, @Req() req: AuthRequest) {
        const {
            userId,
            page,
            archived,
            endDate,
            startDate,
            status,
            flightNumber,
            icao,
            role,
            agentId,
            duplicated,
            onlyRecentlyUpdates,
            referralCode,
        } = query;

        return this.claimService.getUserClaims(userId, +page, {
            archived:
                archived == undefined ? undefined : archived == IsYesOrNo.YES,
            duplicated:
                duplicated == undefined
                    ? undefined
                    : duplicated == IsYesOrNo.YES,
            onlyRecentlyUpdates:
                onlyRecentlyUpdates == undefined
                    ? undefined
                    : onlyRecentlyUpdates == IsYesOrNo.YES,
            date: endDate &&
                startDate && {
                    start: startDate,
                    end: endDate,
                },
            status,
            icao,
            flightNumber,
            role,
            referralCode,
            agentId:
                agentId ||
                (req.user.role == UserRole.LAWYER ||
                req.user.role == UserRole.AGENT
                    ? req.user.id
                    : undefined),
            isOrderByAssignedAt: req.user.role != UserRole.ADMIN,
        });
    }

    @Patch(':claimId/recent-updates')
    async patchHasRecentUpdates(@Param('claimId') claimId: string) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.recentUpdatesService.unviewRecentUpdatesByClaimId(claimId);

        return this.claimService.updateHasRecentUpdate(false, claimId);
    }

    @Get('stats')
    async getAdminClaimsStats(
        @Req() req: AuthRequest,
        @Query() query: GetAdminClaimsStatsQuery,
    ) {
        const { userId, dateTo, dateFrom } = query;

        const agentId =
            req.user.role == UserRole.AGENT ||
            req.user.role == UserRole.LAWYER ||
            req.user.role == UserRole.PARTNER
                ? req.user.id
                : undefined;

        const stats = await this.claimService.getUserClaimsStats(
            userId,
            agentId,
            dateFrom && dateTo
                ? {
                      dateFrom,
                      dateTo,
                  }
                : undefined,
        );

        return {
            ...stats,
            airlines: stats.airlines.map(
                (s: { count: number; name: string }) => ({
                    airline: s.name,
                    count: s.count,
                }),
            ),
        };
    }

    @Patch(':claimId/archive')
    @UseGuards(IsAdminGuard)
    async archiveClaim(
        @Body() dto: ArchiveClaimDto,
        @Param('claimId') claimId: string,
        @Req() req: AuthRequest,
    ) {
        const { archived } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        if (req.user.role != UserRole.ADMIN && req.user.id != claim.agentId) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
        }

        await this.claimService.setArchived(claimId, archived);
    }

    @Get(':claimId')
    async getAdminClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        return claim;
    }

    @Put(':claimId')
    @UseGuards(IsAgentGuard)
    async updateClaim(
        @Body() dto: UpdateClaimDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        return await this.claimService.updateClaim(dto, claimId);
    }

    @Patch(':claimId/agent')
    @UseGuards(IsAdminGuard)
    async addAgent(
        @Body() dto: AddAgentDto,
        @Param('claimId') claimId: string,
    ) {
        const { agentId } = dto;

        const agent = await this.userService.getUserById(agentId);

        if (
            !agent ||
            (agent.role != UserRole.AGENT &&
                agent.role != UserRole.LAWYER &&
                agent.role != UserRole.PARTNER)
        ) {
            throw new NotFoundException(AGENT_NOT_FOUND);
        }

        return await this.claimService.addAgent(claimId, agentId);
    }

    @Delete(':claimId/agent')
    @UseGuards(IsAgentOrLawyerGuardOrPartner)
    async deleteAgent(@Param('claimId') claimId: string) {
        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        return this.claimService.addAgent(claimId, null);
    }
}
