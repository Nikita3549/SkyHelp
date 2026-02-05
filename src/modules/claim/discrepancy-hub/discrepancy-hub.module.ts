import { Module } from '@nestjs/common';
import { DiscrepancyHubService } from './services/discrepancy-hub.service';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';
import { DiscrepancyController } from './discrepancy.controller';
import { DiscrepancyPersistenceService } from './services/discrepancy-persistence.service';

@Module({
    imports: [ClaimPersistenceModule],
    controllers: [DiscrepancyController],
    providers: [DiscrepancyHubService, DiscrepancyPersistenceService],
    exports: [DiscrepancyHubService, DiscrepancyPersistenceService],
})
export class DiscrepancyHubModule {}
