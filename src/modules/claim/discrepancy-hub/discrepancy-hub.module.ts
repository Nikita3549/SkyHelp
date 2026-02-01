import { Module } from '@nestjs/common';
import { DiscrepancyHubService } from './discrepancy-hub.service';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [ClaimPersistenceModule],
    providers: [DiscrepancyHubService],
    exports: [DiscrepancyHubService],
})
export class DiscrepancyHubModule {}
