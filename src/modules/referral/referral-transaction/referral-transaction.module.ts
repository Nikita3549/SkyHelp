import { Module } from '@nestjs/common';
import { ReferralTransactionService } from './referral-transaction.service';
import { PartnerModule } from '../partner/partner.module';

@Module({
    imports: [PartnerModule],
    providers: [ReferralTransactionService],
    exports: [ReferralTransactionService],
})
export class ReferralTransactionModule {}
