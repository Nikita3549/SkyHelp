import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY } from '../constants';
import { NotificationService } from '../../../notification/notification.service';
import { ISendNewProgressEmailJobData } from '../interfaces/send-new-progress-email-job-data.interface';
import { ProgressService } from '../progress.service';
import { ClaimService } from '../../claim.service';
import { ProgressLogger } from '../progress.logger';

@Processor(SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY)
export class SendNewProgressEmailProcessor extends WorkerHost {
    private readonly logger: ProgressLogger;
    constructor(
        private readonly notificationService: NotificationService,
        private readonly progressService: ProgressService,
        private readonly claimService: ClaimService,
    ) {
        super();

        this.logger = new ProgressLogger();
    }

    async process(job: Job<ISendNewProgressEmailJobData>) {
        const { progressId, emailData, newClaimStatus } = job.data;
        this.logger.log(
            `claimId: ${emailData.claimId} progress job data: ${JSON.stringify(job.data, null, 2)}`,
        );

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

        await this.claimService.updateStatus(newClaimStatus, emailData.claimId);
    }
}
