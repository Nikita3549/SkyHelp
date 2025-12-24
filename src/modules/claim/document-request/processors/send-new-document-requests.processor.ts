import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from '../../../notification/notification.service';
import { ClaimService } from '../../claim.service';
import { SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY } from '../constants';
import { DocumentRequestService } from '../document-request.service';
import { SendNewDocumentRequestJobDataInterface } from '../interfaces/send-new-document-request-job-data.interface';
import { DocumentRequestReason } from '@prisma/client';
import { Languages } from '../../../language/enums/languages.enums';

@Processor(SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY)
export class SendNewDocumentRequestsProcessor extends WorkerHost {
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
            await this.documentRequestService.getActiveByClaimId(claimId);

        if (documentRequests.length == 0) {
            return;
        }
        const claim = await this.claimService.getClaim(claimId);
        if (!claim) {
            return;
        }

        const mappedDocumentRequests = await Promise.all(
            documentRequests.map(async (r) => {
                const passenger =
                    (await this.claimService.getCustomerOrOtherPassengerById(
                        r.passengerId,
                    ))!;

                if (r.reason != DocumentRequestReason.MISSING_DOCUMENT) {
                    await this.notificationService.sendSpecializedDocumentRequest(
                        claim.customer.email,
                        {
                            customerName: customerName,
                            claimId: claim.id,
                            documentRequestReason: r.reason,
                            passengerId: r.passengerId,
                            passengerName: passenger.firstName,
                            isCustomer: passenger.isCustomer,
                        },
                        claim.customer.language as Languages,
                    );
                }

                return {
                    documentType: r.documentType,
                    client: `${passenger?.firstName} ${passenger?.lastName}`,
                };
            }),
        );

        await this.notificationService.sendDocumentRequest(
            to,
            {
                documentRequestsData: mappedDocumentRequests,
                claimId,
                customerName,
            },
            language,
        );
    }
}
