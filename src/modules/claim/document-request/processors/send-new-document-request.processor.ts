import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from '../../../notification/notification.service';
import { ClaimService } from '../../claim.service';
import { SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY } from '../constants';
import { DocumentRequestService } from '../document-request.service';
import { SendNewDocumentRequestJobDataInterface } from '../interfaces/send-new-document-request-job-data.interface';

@Processor(SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY)
export class SendNewDocumentRequestProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly claimService: ClaimService,
        private readonly documentRequestService: DocumentRequestService,
    ) {
        super();
    }

    async process(job: Job<SendNewDocumentRequestJobDataInterface>) {
        const { claimId, to, language, customerName } = job.data;

        const documentRequests =
            await this.documentRequestService.getNotSentByClaimId(claimId);

        if (documentRequests.length == 0) {
            return;
        }

        await this.notificationService.sendDocumentRequest(
            to,
            {
                documentRequestsData: await Promise.all(
                    documentRequests.map(async (r) => {
                        const passenger =
                            await this.claimService.getCustomerOrOtherPassengerById(
                                r.passengerId,
                            );

                        return {
                            documentType: r.documentType,
                            client: `${passenger?.firstName} ${passenger?.lastName}`,
                        };
                    }),
                ),
                claimId,
                customerName,
            },
            language,
        );

        this.documentRequestService.markDocumentRequestsAsSent(claimId);
    }
}
