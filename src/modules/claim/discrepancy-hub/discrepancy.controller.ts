import { Body, Controller, Param, Patch } from '@nestjs/common';
import { ClaimDiscrepancy } from '@prisma/client';
import { UpdateDiscrepancyStatusDto } from './dto/update-discrepancy-status.dto';
import { DiscrepancyPersistenceService } from './services/discrepancy-persistence.service';

@Controller('claims/:claimId/discrepancies')
export class DiscrepancyController {
    constructor(
        private readonly discrepancyPersistenceService: DiscrepancyPersistenceService,
    ) {}

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
