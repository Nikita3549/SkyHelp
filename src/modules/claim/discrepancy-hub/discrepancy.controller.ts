import { Body, Controller, Param, Patch, Post, Put } from '@nestjs/common';
import { ClaimDiscrepancy } from '@prisma/client';
import { UpdateDiscrepancyStatusDto } from './dto/update-discrepancy-status.dto';
import { DiscrepancyPersistenceService } from './services/discrepancy-persistence.service';
import { DiscrepancyHubService } from './services/discrepancy-hub.service';
import { RefreshDiscrepancyResponse } from './interfaces/refresh-discrepancy-response.interface';

@Controller('claims/:claimId/discrepancies')
export class DiscrepancyController {
    constructor(
        private readonly discrepancyPersistenceService: DiscrepancyPersistenceService,
        private readonly discrepancyHubService: DiscrepancyHubService,
    ) {}

    @Post(':discrepancyId/refresh')
    async refreshDiscrepancy(
        @Param('discrepancyId') discrepancyId: string,
        @Param('claimId') claimId: string,
    ): Promise<RefreshDiscrepancyResponse> {
        return this.discrepancyHubService.refreshSignatureDiscrepancy(
            claimId,
            discrepancyId,
        );
    }

    @Patch(':discrepancyId')
    async updateDiscrepancyStatus(
        @Body() dto: UpdateDiscrepancyStatusDto,
        @Param('discrepancyId') discrepancyId: string,
    ): Promise<ClaimDiscrepancy> {
        return this.discrepancyPersistenceService.updateStatus(
            dto.status,
            discrepancyId,
        );
    }
}
