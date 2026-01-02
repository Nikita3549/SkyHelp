import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationService } from '../../../notification/services/notification.service';
import { ClaimService } from '../../claim.service';
import { SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY } from '../constants';
import { DocumentRequestService } from '../document-request.service';
import { SendNewDocumentRequestJobDataInterface } from '../interfaces/send-new-document-request-job-data.interface';
import { DocumentRequestReason, DocumentType } from '@prisma/client';
import { Languages } from '../../../language/enums/languages.enums';
import { DocumentRequestLetter } from '../../../notification/letters/definitions/claim/document-request.letter';
import { ConfigService } from '@nestjs/config';
import { GenerateLinksService } from '../../../generate-links/generate-links.service';
import { SpecializedDocumentRequestLetter } from '../../../notification/letters/definitions/claim/specialized-document-request.letter';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';

@Processor(SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY)
export class SendNewDocumentRequestsProcessor extends WorkerHost {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly documentRequestService: DocumentRequestService,
        private readonly configService: ConfigService,
        private readonly generateLinksService: GenerateLinksService,
        private readonly claimPersistenceService: ClaimPersistenceService,
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
        const claim = await this.claimPersistenceService.findOneById(claimId);
        if (!claim) {
            return;
        }

        const mappedDocumentRequests = await Promise.all(
            documentRequests.map(async (r) => {
                const passenger =
                    (await this.claimPersistenceService.getBasePassenger(
                        r.passengerId,
                    ))!;

                if (r.reason != DocumentRequestReason.MISSING_DOCUMENT) {
                    const { continueLink } = await this.generateContinueLink({
                        claimId: claim.id,
                        documentRequestReason: r.reason,
                        passengerId: r.passengerId,
                        passengerName: passenger.firstName,
                        isCustomer: passenger.isCustomer,
                    });

                    await this.notificationService.sendLetter(
                        new SpecializedDocumentRequestLetter({
                            to: claim.customer.email,
                            customerName: customerName,
                            claimId: claim.id,
                            documentRequestReason: r.reason,
                            continueLink,
                            language: claim.customer.language as Languages,
                        }),
                    );
                }

                return {
                    documentType: r.documentType,
                    client: `${passenger?.firstName} ${passenger?.lastName}`,
                };
            }),
        );

        await this.notificationService.sendLetter(
            new DocumentRequestLetter({
                language,
                to,
                documentRequestsData: mappedDocumentRequests,
                claimId,
                customerName,
                dashboardLink: `${this.configService.getOrThrow('FRONTEND_URL')}/dashboard`,
            }),
        );
    }

    private async generateContinueLink(data: {
        documentRequestReason: DocumentRequestReason;
        claimId: string;
        passengerId: string;
        isCustomer: boolean;
        passengerName: string;
    }): Promise<{ continueLink: string }> {
        const {
            documentRequestReason,
            claimId,
            passengerId,
            isCustomer,
            passengerName,
        } = data;
        if (documentRequestReason == DocumentRequestReason.MISSING_DOCUMENT) {
            throw new Error(
                'You cannot generate continue link for DocumentRequestReason == MISSING_DOCUMENT',
            );
        }

        let continueLink: string;
        const jwt = await this.generateLinksService.generateLinkJwt(claimId);
        switch (documentRequestReason) {
            case DocumentRequestReason.PASSPORT_IMAGE_UNCLEAR:
                continueLink =
                    await this.generateLinksService.generateUploadDocuments(
                        passengerId,
                        claimId,
                        jwt,
                        JSON.stringify({
                            documentTypes: [DocumentType.PASSPORT],
                        }),
                        passengerName,
                    );
                break;
            case DocumentRequestReason.PASSPORT_MISMATCH:
                continueLink =
                    await this.generateLinksService.generateUploadDocuments(
                        passengerId,
                        claimId,
                        jwt,
                        JSON.stringify({
                            documentTypes: [DocumentType.PASSPORT],
                        }),
                        passengerName,
                    );
                break;
            case DocumentRequestReason.SIGNATURE_MISMATCH:
                if (isCustomer) {
                    continueLink =
                        await this.generateLinksService.generateSignCustomer(
                            passengerId,
                            claimId,
                            jwt,
                        );
                } else {
                    continueLink =
                        await this.generateLinksService.generateSignOtherPassenger(
                            passengerId,
                            jwt,
                            false,
                        );
                }
                break;
        }

        return {
            continueLink,
        };
    }
}
