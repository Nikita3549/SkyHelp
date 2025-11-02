import { Module } from '@nestjs/common';
import { PayoutService } from './payout.service';
import { PayoutController } from './payout.controller';
import { PartnerModule } from '../partner/partner.module';
import { NotificationModule } from '../../notification/notification.module';
import { PartnerSettingsModule } from '../partner/partner-settings/partner-settings.module';

@Module({
    imports: [PartnerModule, NotificationModule, PartnerSettingsModule],
    providers: [PayoutService],
    controllers: [PayoutController],
})
export class PayoutModule {}
