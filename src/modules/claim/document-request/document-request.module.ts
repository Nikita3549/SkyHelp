import { forwardRef, Module } from '@nestjs/common';
import { DocumentRequestService } from './document-request.service';
import { DocumentRequestController } from './document-request.controller';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    controllers: [DocumentRequestController],
    providers: [DocumentRequestService],
    exports: [DocumentRequestService],
})
export class DocumentRequestModule {}
