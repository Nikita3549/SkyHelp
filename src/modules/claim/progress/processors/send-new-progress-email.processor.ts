import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY } from '../constants';
import { NotificationService } from '../../../notification/services/notification.service';
import { ISendNewProgressEmailJobData } from '../interfaces/send-new-progress-email-job-data.interface';
import { ProgressService } from '../progress.service';
import { ClaimService } from '../../claim.service';
import { ReferralTransactionService } from '../../../referral/referral-transaction/referral-transaction.service';
import { ClaimStatus, Prisma } from '@prisma/client';
import { REFERRAL_RATE } from '../../../referral/referral-transaction/constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { NewStatusLetter } from '../../../notification/letters/definitions/claim/new-status.letter';
import { ConfigService } from '@nestjs/config';

@Processor(SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY)
export class SendNewProgressEmailProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly progressService: ProgressService,
        private readonly claimService: ClaimService,
        private readonly referralTransactionService: ReferralTransactionService,
        private readonly prisma: PrismaService,
        private readonly configService: ConfigService,
    ) {
        super();
    }

    async process(job: Job<ISendNewProgressEmailJobData>) {
        const { progressId, emailData, newClaimStatus, referralCode } =
            job.data;

        const progress = await this.progressService.getProgressById(progressId);

        if (!progress) {
            return;
        }

        const maxProgressOrder = await this.progressService.getMaxProgressOrder(
            progress.claimStateId,
        );

        if (!maxProgressOrder || maxProgressOrder > progress.order) {
            return;
        }

        const claim = await this.claimService.getClaim(emailData.claimId);

        if (!claim) {
            return;
        }

        this.prisma.$transaction(async (tx: Prisma.TransactionClient) => {
            await this.claimService.updateStatus(
                newClaimStatus,
                emailData.claimId,
                tx,
            );

            if (
                newClaimStatus == ClaimStatus.PAID &&
                referralCode &&
                !(await this.referralTransactionService.getReferralTransactionByClaimId(
                    claim.id,
                ))
            ) {
                const passengersCount = 1 + claim.passengers.length;
                const amount =
                    passengersCount * claim.state.amount * REFERRAL_RATE;

                await this.referralTransactionService.makeReferralTransaction(
                    {
                        claimId: emailData.claimId,
                        referralCode,
                        amount,
                    },
                    tx,
                );
            }
        });

        await this.notificationService.sendLetter(
            new NewStatusLetter({
                to: emailData.to,
                language: emailData.language,
                title: emailData.title,
                description: emailData.description,
                clientName: emailData.clientName,
                claimId: emailData.claimId,
                comments: progress.comments,
                dashboardLink: `${this.configService.getOrThrow('FRONTEND_URL')}/dashboard`,
            }),
        );
    }
}
