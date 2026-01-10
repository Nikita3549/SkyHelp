import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import {
    CLAIM_REMINDER_INTERVAL,
    CLAIM_REMINDER_QUEUE_KEY,
} from '../constants';
import { NotificationService } from '../../notification/services/notification.service';
import { ClaimReminderJobDataInterface } from '../interfaces/job-data/claim-reminder-job-data.interface';
import { ClaimStatus } from '@prisma/client';
import { ReminderTypeEnum } from '../../notification/enums/reminder-type.enum';
import { Languages } from '../../language/enums/languages.enums';
import { getNextWorkTime } from '../../../common/utils/getNextWorkTime';
import { ClaimReminderLetter } from '../../notification/letters/definitions/claim/claim-reminder.letter';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';

@Processor(CLAIM_REMINDER_QUEUE_KEY)
export class ClaimReminderProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationService,
        @InjectQueue(CLAIM_REMINDER_QUEUE_KEY)
        private readonly claimReminderQueue: Queue,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {
        super();
    }

    async process(job: Job<ClaimReminderJobDataInterface>) {
        const { claimId } = job.data;

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            return;
        }

        const claimStatus = claim.state.status;
        if (
            claimStatus != ClaimStatus.CLAIM_RECEIVED &&
            claimStatus != ClaimStatus.LEGAL_PROCESS &&
            claimStatus != ClaimStatus.SENT_TO_AIRLINE
        ) {
            return;
        }

        await this.notificationService.sendLetter(
            new ClaimReminderLetter({
                to: claim.customer.email,
                language: claim.customer.language as Languages,
                customerName: claim.customer.firstName,
                claimId: claim.id,
                reminderType:
                    claimStatus == ClaimStatus.CLAIM_RECEIVED
                        ? ReminderTypeEnum.CLAIM_RECEIVED
                        : claimStatus == ClaimStatus.SENT_TO_AIRLINE
                          ? ReminderTypeEnum.SENT_TO_AIRLINE
                          : ReminderTypeEnum.LEGAL_PROCESS,
            }),
        );

        const jobData: ClaimReminderJobDataInterface = {
            claimId: claim.id,
        };

        await this.claimReminderQueue.add('claimReminder', jobData, {
            delay: getNextWorkTime(CLAIM_REMINDER_INTERVAL),
            attempts: 1,
        });
    }
}
