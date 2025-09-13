import { forwardRef, Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import {
    DocumentController,
    PublicDocumentController,
} from './document.controller';
import { ClaimModule } from '../claim.module';
import { TokenModule } from '../../token/token.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';
import { DocumentRequestModule } from '../document-request/document-request.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        TokenModule,
        RecentUpdatesModule,
        DocumentRequestModule,
    ],
    providers: [DocumentService],
    exports: [DocumentService],
    controllers: [DocumentController, PublicDocumentController],
})
export class DocumentModule {}
