import { forwardRef, Module } from '@nestjs/common';
import { DocumentRequestService } from './document-request.service';
import { DocumentRequestController } from './document-request.controller';
import { ClaimModule } from '../claim.module';
import { BullModule } from '@nestjs/bullmq';
import { SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY } from './constants';
import { SendNewDocumentRequestProcessor } from './processors/send-new-document-request.processor';
import { NotificationModule } from '../../notification/notification.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        BullModule.registerQueue({
            name: SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY,
        }),
        forwardRef(() => NotificationModule),
    ],
    controllers: [DocumentRequestController],
    providers: [DocumentRequestService, SendNewDocumentRequestProcessor],
    exports: [DocumentRequestService, DocumentRequestService],
})
export class DocumentRequestModule {}
