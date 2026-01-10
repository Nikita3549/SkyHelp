import { forwardRef, Module } from '@nestjs/common';
import { DocumentRequestService } from './document-request.service';
import { DocumentRequestController } from './document-request.controller';
import { BullModule } from '@nestjs/bullmq';
import { SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY } from './constants';
import { SendNewDocumentRequestsProcessor } from './processors/send-new-document-requests.processor';
import { NotificationModule } from '../../notification/notification.module';
import { RedisModule } from '../../redis/redis.module';
import { GenerateLinksModule } from '../../generate-links/generate-links.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY,
        }),
        NotificationModule,
        RedisModule,
        forwardRef(() => GenerateLinksModule),
        ClaimPersistenceModule,
    ],
    controllers: [DocumentRequestController],
    providers: [DocumentRequestService, SendNewDocumentRequestsProcessor],
    exports: [DocumentRequestService, DocumentRequestService],
})
export class DocumentRequestModule {}
