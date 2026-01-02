import { forwardRef, Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { NotificationModule } from '../../notification/notification.module';
import { ClaimModule } from '../claim.module';
import { BullModule } from '@nestjs/bullmq';
import { SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY } from './constants';
import { SendNewProgressEmailProcessor } from './processors/send-new-progress-email.processor';
import { LanguageModule } from '../../language/language.module';
import { ReferralTransactionModule } from '../../referral/referral-transaction/referral-transaction.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [
        NotificationModule,
        BullModule.registerQueue({
            name: SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY,
        }),
        LanguageModule,
        ReferralTransactionModule,
        ClaimPersistenceModule,
    ],
    controllers: [ProgressController],
    providers: [ProgressService, SendNewProgressEmailProcessor],
    exports: [ProgressService],
})
export class ProgressModule {}
