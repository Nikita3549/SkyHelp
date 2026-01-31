import { forwardRef, Module } from '@nestjs/common';
import { DocumentService } from './services/document.service';
import { DocumentController } from './controllers/document.controller';
import { ClaimModule } from '../claim.module';
import { TokenModule } from '../../token/token.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';
import { DocumentRequestModule } from '../document-request/document-request.module';
import { PublicDocumentController } from './controllers/public-document.controller';
import { DocumentDbService } from './services/database/document-db.service';
import { DocumentAssignmentService } from './services/assignment/document-assignment.service';
import { DocumentFileService } from './services/file/document-file.service';
import { S3Module } from '../../s3/s3.module';
import { GenerateAssignmentProcessor } from './processors/generate-assignment.processor';
import { BullModule } from '@nestjs/bullmq';
import { GENERATE_ASSIGNMENT_QUEUE_KEY } from './processors/constants/generate-assignment-queue-key';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';
import { DiscrepancyHubModule } from '../discrepancy-hub/discrepancy-hub.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        TokenModule,
        RecentUpdatesModule,
        DocumentRequestModule,
        S3Module,
        BullModule.registerQueue({
            name: GENERATE_ASSIGNMENT_QUEUE_KEY,
        }),
        ClaimPersistenceModule,
        DiscrepancyHubModule,
    ],
    controllers: [DocumentController, PublicDocumentController],
    providers: [
        DocumentService,
        DocumentDbService,
        DocumentFileService,
        DocumentAssignmentService,
        GenerateAssignmentProcessor,
    ],
    exports: [DocumentService],
})
export class DocumentModule {}
