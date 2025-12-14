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
import { GetClaimsQuery, IsYesOrNo } from './dto/get-claims.query';
import { ArchiveClaimDto } from './dto/archive-claim.dto';
import { CLAIM_NOT_FOUND, HAVE_NO_RIGHTS_ON_CLAIM } from '../constants';
import { UpdateClaimDto } from '../dto/update-claim.dto';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { ClaimService } from '../claim.service';
import { AddAgentDto } from './dto/add-agent.dto';
import { UserService } from '../../user/user.service';
import { UserRole } from '@prisma/client';
import { AGENT_NOT_FOUND } from './constants';
import { AuthRequest } from '../../../common/interfaces/AuthRequest.interface';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import { GetAdminClaimsStatsQuery } from './dto/get-admin-claims-stats.query';
import { DeleteDuplicatesDto } from './dto/delete-duplicates.dto';
import { PartnerService } from '../../referral/partner/partner.service';
import { CreatePartnerDto } from './dto/create-partner.dto';
import { RoleGuard } from '../../../common/guards/role.guard';
import { ViewClaimType } from '../enums/view-claim-type.enum';
import { OtherPassengerService } from '../other-passenger/other-passenger.service';
import { OtherPassengerDto } from '../other-passenger/dto/create-other-passengers.dto';

@Controller('claims/admin')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([
        UserRole.ADMIN,
        UserRole.AGENT,
        UserRole.LAWYER,
        UserRole.ACCOUNTANT,
        UserRole.PARTNER,
        UserRole.AFFILIATE,
    ]),
)
export class AdminController {
    constructor(
        private readonly claimService: ClaimService,
        private readonly userService: UserService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly partnerService: PartnerService,
        private readonly otherPassengersService: OtherPassengerService,
    ) {}

    @Post(':claimId/passenger')
    async createOtherPassenger(
        @Body() dto: OtherPassengerDto,
        @Param('claimId') claimId: string,
    ) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        return this.otherPassengersService.createOtherPassengers(
            [dto],
            claimId,
            claim.customer.compensation,
        );
    }

    @Post('partner')
    @UseGuards(new RoleGuard([UserRole.ADMIN]))
    async createPartner(@Body() dto: CreatePartnerDto) {
        const { referralCode, userId, userRole } = dto;

        const user = await this.userService.getUserById(userId);

        if (!user) {
            return;
        }

        await this.userService.updateRole(userRole, user.id);

        const partner = await this.partnerService.getPartnerByUserId(userId);

        if (partner) {
            return partner;
        }

        return await this.partnerService.createPartner({
            userId,
            referralCode,
            userEmail: user.email,
        });
    }

    @Post('revoke')
    @HttpCode(HttpStatus.NO_CONTENT)
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.ACCOUNTANT,
        ]),
    )
    async revokeClaim(@Body() dto: DeleteDuplicatesDto) {
        const { claimId } = dto;

        const duplicates = await this.claimService.getDuplicates(claimId);

        const claimsIdsToRevoke = duplicates.map((d) => d.duplicatedClaimId);

        await this.claimService.archiveMany(claimsIdsToRevoke);
        await this.claimService.deleteDuplicates([
            ...claimsIdsToRevoke,
            claimId,
        ]);
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

        const requireReferralCode =
            req.user.role != UserRole.ADMIN &&
            req.user.role != UserRole.LAWYER &&
            req.user.role != UserRole.AGENT &&
            req.user.role != UserRole.ACCOUNTANT;

        if (requireReferralCode && !referralCode) {
            throw new ForbiddenException('Missed required param referralCode');
        }

        let viewType =
            req.user.role == UserRole.AFFILIATE
                ? ViewClaimType.AFFILIATE
                : req.user.role == UserRole.ACCOUNTANT
                  ? ViewClaimType.ACCOUNTANT
                  : ViewClaimType.FULL;

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
            airlineIcaos: icao?.split(','),
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
            viewType,
        });
    }

    @Patch(':claimId/recent-updates')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.ACCOUNTANT,
        ]),
    )
    async patchHasRecentUpdates(@Param('claimId') claimId: string) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.recentUpdatesService.unviewRecentUpdatesByClaimId(claimId);

        return this.claimService.updateHasRecentUpdate(false, claimId);
    }

    @Get('stats')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.ACCOUNTANT,
        ]),
    )
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
            airlines: stats.airlines,
        };
    }

    @Patch(':claimId/archive')
    @UseGuards(new RoleGuard([UserRole.ADMIN]))
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
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    async getAdminClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        return claim;
    }

    @Put(':claimId')
    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
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
    @UseGuards(new RoleGuard([UserRole.ADMIN]))
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
                agent.role != UserRole.ACCOUNTANT &&
                agent.role != UserRole.PARTNER)
        ) {
            throw new NotFoundException(AGENT_NOT_FOUND);
        }

        return await this.claimService.addAgent(claimId, agentId);
    }

    @Delete(':claimId/agent')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.AGENT,
            UserRole.LAWYER,
            UserRole.ACCOUNTANT,
        ]),
    )
    async deleteAgent(@Param('claimId') claimId: string) {
        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        return this.claimService.addAgent(claimId, null);
    }
}
