import { Module } from '@nestjs/common';
import { ClaimPersistenceService } from './services/claim-persistence.service';
import { ClaimIncludeProvider } from './providers/claim-include.provider';
import { ClaimSearchService } from './services/claim-search.service';
import { ClaimStatsService } from './services/claim-stats.service';

@Module({
    providers: [
        ClaimPersistenceService,
        ClaimIncludeProvider,
        ClaimSearchService,
        ClaimStatsService,
    ],
    exports: [ClaimPersistenceService, ClaimSearchService, ClaimStatsService],
})
export class ClaimPersistenceModule {}
