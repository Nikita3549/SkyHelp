import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY } from '../constants';
import { NotificationService } from '../../../notification/notification.service';
import { ISendNewProgressEmailJobData } from '../interfaces/send-new-progress-email-job-data.interface';
import { ProgressService } from '../progress.service';

@Processor(SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY)
export class SendNewProgressEmailProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly progressService: ProgressService,
    ) {
        super();
    }
    async process(job: Job<ISendNewProgressEmailJobData>) {
        const { progressId, emailData } = job.data;

        const progress = await this.progressService.getProgressById(progressId);

        if (!progress) {
            return;
        }

        await this.notificationService.sendNewStatus(
            emailData.to,
            {
                title: emailData.title,
                description: emailData.description,
                clientName: emailData.clientName,
                claimId: emailData.claimId,
            },
            emailData.language,
        );

        console.log('done');
    }
}
