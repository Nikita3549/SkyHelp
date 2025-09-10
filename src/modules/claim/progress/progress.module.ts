import { forwardRef, Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { StateModule } from '../state/state.module';
import { NotificationModule } from '../../notification/notification.module';
import { ClaimModule } from '../claim.module';
import { BullModule } from '@nestjs/bullmq';
import { SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY } from './constants';
import { SendNewProgressEmailProcessor } from './processors/send-new-progress-email.processor';

@Module({
    imports: [
        forwardRef(() => NotificationModule),
        forwardRef(() => ClaimModule),
        BullModule.registerQueue({
            name: SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY,
        }),
    ],
    controllers: [ProgressController],
    providers: [ProgressService, SendNewProgressEmailProcessor],
})
export class ProgressModule {}
