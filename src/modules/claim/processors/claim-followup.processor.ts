import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    CLAIM_FOLLOWUP_QUEUE_KEY,
    CLAIM_NOT_FOUND,
    PAYMENT_STEP,
} from '../constants';
import { NotificationService } from '../../notification/notification.service';
import { IJobClaimFollowupData } from '../interfaces/job-data.interface';
import { ClaimService } from '../claim.service';
import { EmailResumeClickService } from '../../email-resume-click/email-resume-click.service';

@Processor(CLAIM_FOLLOWUP_QUEUE_KEY)
export class ClaimFollowupProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly claimService: ClaimService,
        private readonly emailResumeClickService: EmailResumeClickService,
    ) {
        super();
    }

    async process(job: Job<IJobClaimFollowupData>) {
        const {
            email,
            claimId,
            continueClaimLink,
            clientFirstName,
            compensation,
            language,
        } = job.data;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new Error(CLAIM_NOT_FOUND);
        }

        if (claim.step >= PAYMENT_STEP || claim.archived) {
            return;
        }

        await this.emailResumeClickService.createRecord(claimId);

        await this.notificationService.sendFinishClaim(
            email,
            {
                clientFirstName,
                continueClaimLink,
                compensation,
                id: claimId,
            },
            language,
        );

        return;
    }
}
