import { forwardRef, Module } from '@nestjs/common';
import { PaymentController } from './controllers/payment.controller';
import { PaymentService } from './payment.service';
import { ClaimModule } from '../claim.module';
import { BullModule } from '@nestjs/bullmq';
import { REQUEST_PAYMENT_DETAILS_QUEUE_KEY } from '../constants';
import { GenerateLinksModule } from '../../generate-links/generate-links.module';
import { NotificationModule } from '../../notification/notification.module';
import { RequestPaymentDetailsProcessor } from '../processors/request-payment-details.processor';
import { TokenModule } from '../../token/token.module';
import { PaymentPublicController } from './controllers/payment-public.controller';
import { ActivityModule } from '../activity/activity.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        BullModule.registerQueue({
            name: REQUEST_PAYMENT_DETAILS_QUEUE_KEY,
        }),
        forwardRef(() => NotificationModule),
        forwardRef(() => GenerateLinksModule),
        TokenModule,
        ActivityModule,
    ],
    controllers: [PaymentController, PaymentPublicController],
    providers: [PaymentService, RequestPaymentDetailsProcessor],
})
export class PaymentModule {}
