import { Module } from '@nestjs/common';
import { DiscrepancyHubService } from './discrepancy-hub.service';

@Module({
    providers: [DiscrepancyHubService],
    exports: [DiscrepancyHubService],
})
export class DiscrepancyHubModule {}
