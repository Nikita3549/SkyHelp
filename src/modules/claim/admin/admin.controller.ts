import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Patch,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { IsAdminGuard } from '../../../guards/isAdminGuard';
import { GetClaimsQuery } from './dto/get-claims.query';
import { ArchiveClaimDto } from './dto/archive-claim.dto';
import { DONT_HAVE_RIGHTS_ON_CLAIM, INVALID_CLAIM_ID } from '../constants';
import { UpdateClaimDto } from '../dto/update-claim.dto';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { ClaimService } from '../claim.service';
import { AddPartnerDto } from './dto/add-partner.dto';
import { UserService } from '../../user/user.service';
import { UserRole } from '@prisma/client';
import { INVALID_PARTNER_ID } from './constants';
import { IsPartnerOrAgentGuard } from '../../../guards/isPartnerOrAgentGuard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { IsAgentGuard } from '../../../guards/isAgent.guard';

@Controller('claims/admin')
@UseGuards(JwtAuthGuard, IsPartnerOrAgentGuard)
export class AdminController {
    constructor(
        private readonly claimService: ClaimService,
        private readonly userService: UserService,
    ) {}

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
            partnerId,
            duplicated,
        } = query;

        return this.claimService.getUserClaims(userId, +page, {
            archived: archived == undefined ? undefined : archived == 'yes',
            duplicated:
                duplicated == undefined ? undefined : duplicated == 'yes',
            date: endDate &&
                startDate && {
                    start: startDate,
                    end: endDate,
                },
            status,
            icao,
            flightNumber,
            role,
            partnerId:
                partnerId ||
                (req.user.role == UserRole.PARTNER ||
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
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        this.claimService.updateHasRecentUpdate(false, claimId);
    }

    @Get('stats')
    async getAdminClaimsStats(
        @Req() req: AuthRequest,
        @Query('userId') userId?: string,
    ) {
        const partnerId =
            req.user.role == UserRole.PARTNER || req.user.role == UserRole.AGENT
                ? req.user.id
                : undefined;

        return this.claimService.getUserClaimsStats(userId, partnerId);
    }

    @Get('stats/airlines')
    @UseGuards(IsAdminGuard)
    async getAdminAirlineStats() {
        const stats = await this.claimService.getAirlineStats();

        return stats.map((s) => ({
            airline: s.name,
            count: s._count._all,
        }));
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
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        if (req.user.role != UserRole.ADMIN && req.user.id != claim.partnerId) {
            throw new ForbiddenException(DONT_HAVE_RIGHTS_ON_CLAIM);
        }

        await this.claimService.setArchived(claimId, archived);
    }

    @Get(':claimId')
    async getAdminClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(INVALID_CLAIM_ID);
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
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return await this.claimService.updateClaim(dto, claimId);
    }

    @Patch(':claimId/partner')
    @UseGuards(IsAdminGuard)
    async addPartner(
        @Body() dto: AddPartnerDto,
        @Param('claimId') claimId: string,
    ) {
        const { partnerId } = dto;

        const partner = await this.userService.getUserById(partnerId);

        if (
            !partner ||
            (partner.role != UserRole.PARTNER && partner.role != UserRole.AGENT)
        ) {
            throw new NotFoundException(INVALID_PARTNER_ID);
        }

        return await this.claimService.addPartner(claimId, partnerId);
    }

    @Delete(':claimId/partner')
    @UseGuards(IsPartnerOrAgentGuard)
    async deletePartner(@Param('claimId') claimId: string) {
        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return this.claimService.addPartner(claimId, null);
    }
}
