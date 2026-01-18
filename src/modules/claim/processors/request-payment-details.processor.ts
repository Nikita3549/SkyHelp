import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import {
    CONTINUE_LINKS_EXP,
    REQUEST_PAYMENT_DETAILS_QUEUE_KEY,
} from '../constants';
import { NotificationService } from '../../notification/services/notification.service';
import { IPaymentDetailsRequestJobData } from '../interfaces/job-data/payment-details-request-job-data.interface';
import { GenerateLinksService } from '../../generate-links/generate-links.service';
import { TokenService } from '../../token/token.service';
import { PaymentRequestLetter } from '../../notification/letters/definitions/claim/payment-request.letter';
import { PaymentService } from '../payment/payment.service';

@Processor(REQUEST_PAYMENT_DETAILS_QUEUE_KEY)
export class RequestPaymentDetailsProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly tokenService: TokenService,
        private readonly paymentService: PaymentService,
    ) {
        super();
    }

    async process(jobData: Job<IPaymentDetailsRequestJobData>) {
        const { claimId, customerEmail, customerName, customerLanguage } =
            jobData.data;

        const isBlocked =
            await this.paymentService.getBlockPaymentRequests(claimId);

        if (isBlocked) {
            return;
        }

        const linkJwt = this.tokenService.generateJWT(
            {
                claimId,
            },
            { expiresIn: CONTINUE_LINKS_EXP },
        );

        const paymentDetailsLink =
            await this.generateLinksService.paymentDetails(linkJwt);

        await this.notificationService.sendLetter(
            new PaymentRequestLetter({
                to: customerEmail,
                customerName: customerName,
                claimId: claimId,
                paymentDetailsLink,
                language: customerLanguage,
            }),
        );
    }
}
