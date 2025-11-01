import { Module } from '@nestjs/common';
import { ReferralLinksController } from './referral-links.controller';
import { ReferralLinksService } from './referral-links.service';
import { PartnerModule } from '../partner/partner.module';

@Module({
    imports: [PartnerModule],
    controllers: [ReferralLinksController],
    providers: [ReferralLinksService],
})
export class ReferralLinksModule {}
