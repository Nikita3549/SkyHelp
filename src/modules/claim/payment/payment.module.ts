import { forwardRef, Module } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    controllers: [PaymentController],
    providers: [PaymentService],
})
export class PaymentModule {}
