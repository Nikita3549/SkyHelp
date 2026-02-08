import { forwardRef, Module } from '@nestjs/common';
import { DiscrepancyHubService } from './services/discrepancy-hub.service';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';
import { DiscrepancyController } from './discrepancy.controller';
import { DiscrepancyPersistenceService } from './services/discrepancy-persistence.service';
import { DocumentModule } from '../document/document.module';
import { S3Module } from '../../s3/s3.module';

@Module({
    imports: [
        ClaimPersistenceModule,
        forwardRef(() => DocumentModule),
        S3Module,
    ],
    controllers: [DiscrepancyController],
    providers: [DiscrepancyHubService, DiscrepancyPersistenceService],
    exports: [DiscrepancyHubService, DiscrepancyPersistenceService],
})
export class DiscrepancyHubModule {}
