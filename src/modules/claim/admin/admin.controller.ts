import {
    BadRequestException,
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Put,
    Query,
    UseGuards,
} from '@nestjs/common';
import { IsModeratorGuard } from '../../../guards/isModerator.guard';
import { GetClaimsQuery } from './dto/get-claims.query';
import { ArchiveClaimDto } from './dto/archive-claim.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { UpdateClaimDto } from '../dto/update-claim.dto';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { ClaimService } from '../claim.service';

@Controller('claims/admin')
@UseGuards(JwtAuthGuard, IsModeratorGuard)
export class AdminController {
    constructor(private readonly claimService: ClaimService) {}

    @Get()
    async getClaims(@Query() query: GetClaimsQuery) {
        const { userId, page, archived } = query;

        return this.claimService.getUserClaims(
            userId,
            +page,
            archived == undefined ? undefined : archived == 'yes',
        );
    }

    @Get('stats')
    async getAdminClaimsStats(@Query('userId') userId?: string) {
        return this.claimService.getUserClaimsStats(userId);
    }

    @Patch(':claimId/archive')
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
    async getAdminClaim(@Param('claimId') claimId: string) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return claim;
    }

    @Put(':claimId')
    async updateClaim(
        @Body() dto: UpdateClaimDto,
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        return await this.claimService.updateClaim(dto, claimId);
    }
}
