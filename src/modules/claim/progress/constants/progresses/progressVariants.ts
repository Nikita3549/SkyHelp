import { ClaimStatus } from '@prisma/client';

export const ProgressVariants: {
    [key: string]: {
        status: ClaimStatus;
        title: string;
        description: string;
    };
} = {
    claimReceived: {
        status: ClaimStatus.CLAIM_RECEIVED,
        title: 'claimReceived.title',
        description: 'claimReceived.description',
    },
    missingInformation: {
        status: ClaimStatus.MISSING_INFO,
        title: 'missingInformation.title',
        description: 'missingInformation.description',
    },
    additionalDocumentsRequired: {
        status: ClaimStatus.DOCS_REQUESTED,
        title: 'additionalDocumentsRequired.title',
        description: 'additionalDocumentsRequired.description',
    },
    claimSubmittedToAirline: {
        status: ClaimStatus.SENT_TO_AIRLINE,
        title: 'claimSubmittedToAirline.title',
        description: 'claimSubmittedToAirline.description',
    },
    awaitingAirlineResponse: {
        status: ClaimStatus.WAITING_AIRLINE,
        title: 'awaitingAirlineResponse.title',
        description: 'awaitingAirlineResponse.description',
    },
    compensationApproved: {
        status: ClaimStatus.APPROVED,
        title: 'compensationApproved.title',
        description: 'compensationApproved.description',
    },
    compensationPaid: {
        status: ClaimStatus.PAID,
        title: 'compensationPaid.title',
        description: 'compensationPaid.description',
    },
    claimRejected: {
        status: ClaimStatus.REJECTED,
        title: 'claimRejected.title',
        description: 'claimRejected.description',
    },
    legalActionInProgress: {
        status: ClaimStatus.LEGAL_PROCESS,
        title: 'legalActionInProgress.title',
        description: 'legalActionInProgress.description',
    },
    closedWithoutResolution: {
        status: ClaimStatus.CLOSED,
        title: 'closedWithoutResolution.title',
        description: 'closedWithoutResolution.description',
    },
    notEligible: {
        status: ClaimStatus.NOT_ELIGIBLE,
        title: 'notEligible.title',
        description: 'notEligible.description',
    },
} as const;
