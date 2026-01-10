import { Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './payment.service';
import { BullModule } from '@nestjs/bullmq';
import { REQUEST_PAYMENT_DETAILS_QUEUE_KEY } from '../constants';
import { GenerateLinksModule } from '../../generate-links/generate-links.module';
import { NotificationModule } from '../../notification/notification.module';
import { RequestPaymentDetailsProcessor } from '../processors/request-payment-details.processor';
import { TokenModule } from '../../token/token.module';
import { PaymentPublicController } from './controllers/payment-public.controller';
import { ActivityModule } from '../activity/activity.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [
        BullModule.registerQueue({
            name: REQUEST_PAYMENT_DETAILS_QUEUE_KEY,
        }),
        NotificationModule,
        GenerateLinksModule,
        TokenModule,
        ActivityModule,
        ClaimPersistenceModule,
    ],
    controllers: [PaymentController, PaymentPublicController],
    providers: [PaymentService, RequestPaymentDetailsProcessor],
})
export class PaymentModule {}
