import { forwardRef, Module } from '@nestjs/common';
import { DocumentService } from './document.service';
import {
    DocumentController,
    PublicDocumentController,
} from './document.controller';
import { ClaimModule } from '../claim.module';
import { TokenModule } from '../../token/token.module';

@Module({
    imports: [forwardRef(() => ClaimModule), TokenModule],
    providers: [DocumentService],
    exports: [DocumentService],
    controllers: [DocumentController, PublicDocumentController],
})
export class DocumentModule {}
