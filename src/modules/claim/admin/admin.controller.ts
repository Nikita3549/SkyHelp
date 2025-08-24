import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    Get,
    NotFoundException,
    Param,
    Patch,
    Put,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { IsModeratorGuard } from '../../../guards/isModerator.guard';
import { GetClaimsQuery } from './dto/get-claims.query';
import { ArchiveClaimDto } from './dto/archive-claim.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { UpdateClaimDto } from '../dto/update-claim.dto';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { ClaimService } from '../claim.service';
import { AddPartnerDto } from './dto/add-partner.dto';
import { UserService } from '../../user/user.service';
import { UserRole } from '@prisma/client';
import { INVALID_PARTNER_ID } from './constants';
import { IsPartnerOrAgentGuard } from '../../../guards/isPartnerOrAgentGuard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';

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
        } = query;

        return this.claimService.getUserClaims(
            userId,
            +page,
            {
                archived: archived == undefined ? undefined : archived == 'yes',
                date: endDate &&
                    startDate && {
                        start: startDate,
                        end: endDate,
                    },
                status,
                icao,
                flightNumber,
            },
            req.user.role == UserRole.PARTNER || req.user.role == UserRole.AGENT
                ? req.user.id
                : undefined,
        );
    }

    @Get('stats')
    @UseGuards(IsModeratorGuard)
    async getAdminClaimsStats(@Query('userId') userId?: string) {
        return this.claimService.getUserClaimsStats(userId);
    }

    @Patch(':claimId/archive')
    @UseGuards(IsModeratorGuard)
    async archiveClaim(
        @Body() dto: ArchiveClaimDto,
        @Param('claimId') claimId: string,
    ) {
        const { archived } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        await this.claimService.setArchived(claimId, archived);
    }

    @Get(':claimId')
    @UseGuards(IsModeratorGuard)
    async getAdminClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return claim;
    }

    @Put(':claimId')
    @UseGuards(IsModeratorGuard)
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
    @UseGuards(IsModeratorGuard)
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
    @UseGuards(IsModeratorGuard)
    async deletePartner(@Param('claimId') claimId: string) {
        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return this.claimService.addPartner(claimId, null);
    }
}
