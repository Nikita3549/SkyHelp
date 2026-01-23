import { Module } from '@nestjs/common';
import { PrelitTemplatesService } from './prelit-templates.service';
import { PrelitTemplatesController } from './prelit-templates.controller';
import { ClaimModule } from '../claim/claim.module';
import { PrelitStaticDocumentsService } from './prelit-static-documents.service';

@Module({
    imports: [ClaimModule],
    providers: [PrelitTemplatesService, PrelitStaticDocumentsService],
    controllers: [PrelitTemplatesController],
})
export class PrelitTemplatesModule {}
