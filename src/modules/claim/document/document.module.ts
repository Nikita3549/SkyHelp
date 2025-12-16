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

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        TokenModule,
        RecentUpdatesModule,
        DocumentRequestModule,
        S3Module,
    ],
    controllers: [DocumentController, PublicDocumentController],
    providers: [
        DocumentService,
        DocumentDbService,
        DocumentFileService,
        DocumentAssignmentService,
    ],
    exports: [DocumentService],
})
export class DocumentModule {}
