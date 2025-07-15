import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { CLAIM_QUEUE_KEY, INVALID_CLAIM_ID } from './constants';
import { NotificationsService } from '../notifications/notifications.service';
import { IJobData } from './interfaces/job-data.interface';
import { ClaimsService } from './claims.service';

@Processor(CLAIM_QUEUE_KEY)
export class ClaimsProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationsService,
        private readonly claimService: ClaimsService,
    ) {
        super();
    }
    async process(job: Job<IJobData>) {
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
            throw new Error(INVALID_CLAIM_ID);
        }

        if (claim.step == 9) {
            return;
        }

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
