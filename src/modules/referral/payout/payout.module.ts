import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { PartnerModule } from '../partner/partner.module';

@Module({
    imports: [PartnerModule],
    providers: [PayoutService],
    controllers: [PayoutController],
})
export class PayoutModule {}
