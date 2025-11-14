import { forwardRef, Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ClaimModule } from '../claim.module';
import { BullModule } from '@nestjs/bullmq';
import { REQUEST_PAYMENT_DETAILS_QUEUE_KEY } from '../constants';
import { GenerateLinksModule } from '../../generate-links/generate-links.module';
import { NotificationModule } from '../../notification/notification.module';
import { RequestPaymentDetailsProcessor } from '../processors/request-payment-details.processor';
import { TokenModule } from '../../token/token.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        BullModule.registerQueue({
            name: REQUEST_PAYMENT_DETAILS_QUEUE_KEY,
        }),
        forwardRef(() => NotificationModule),
        forwardRef(() => GenerateLinksModule),
        TokenModule,
    ],
    controllers: [PaymentController],
    providers: [PaymentService, RequestPaymentDetailsProcessor],
})
export class PaymentModule {}
