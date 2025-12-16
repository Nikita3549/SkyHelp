import { ClaimStatus } from '@prisma/client';

export const ProgressVariants: {
    [key: string]: {
        status: ClaimStatus;
        title: string;
        descriptions: string[];
    };
} = {
    claimReceived: {
        status: ClaimStatus.CLAIM_RECEIVED,
        title: 'claimReceived.title',
        descriptions: [
            'claimReceived.description',
            'claimReceived.description2',
        ],
    },
    missingInformation: {
        status: ClaimStatus.MISSING_INFO,
        title: 'missingInformation.title',
        descriptions: ['missingInformation.description'],
    },
    additionalDocumentsRequired: {
        status: ClaimStatus.DOCS_REQUESTED,
        title: 'additionalDocumentsRequired.title',
        descriptions: ['additionalDocumentsRequired.description'],
    },
    claimSubmittedToAirline: {
        status: ClaimStatus.SENT_TO_AIRLINE,
        title: 'claimSubmittedToAirline.title',
        descriptions: ['claimSubmittedToAirline.description'],
    },
    awaitingAirlineResponse: {
        status: ClaimStatus.WAITING_AIRLINE,
        title: 'awaitingAirlineResponse.title',
        descriptions: ['awaitingAirlineResponse.description'],
    },
    compensationApproved: {
        status: ClaimStatus.APPROVED,
        title: 'compensationApproved.title',
        descriptions: [
            'compensationApproved.description',
            'compensationApproved.description.one-person',
            'compensationApproved.description2',
            'compensationApproved.description3',
        ],
    },
    compensationPaid: {
        status: ClaimStatus.PAID,
        title: 'compensationPaid.title',
        descriptions: [
            'compensationPaid.description',
            'compensationPaid.description2',
            'compensationPaid.description3',
        ],
    },
    claimRejected: {
        status: ClaimStatus.REJECTED,
        title: 'claimRejected.title',
        descriptions: ['claimRejected.description'],
    },
    legalActionInProgress: {
        status: ClaimStatus.LEGAL_PROCESS,
        title: 'legalActionInProgress.title',
        descriptions: [
            'legalActionInProgress.description',
            'legalActionInProgress.first-stage',
            'legalActionInProgress.submitted-to-court',
            'legalActionInProgress.won-case',
            'legalActionInProgress.failed-court',
        ],
    },
    closedWithoutResolution: {
        status: ClaimStatus.CLOSED,
        title: 'closedWithoutResolution.title',
        descriptions: [
            'closedWithoutResolution.description',
            'closedWithoutResolution.description2',
        ],
    },
    notEligible: {
        status: ClaimStatus.NOT_ELIGIBLE,
        title: 'notEligible.title',
        descriptions: [
            'notEligible.description',
            'notEligible.delayUnder3h',
            'notEligible.weather',
            'notEligible.atc',
            'notEligible.airport',
            'notEligible.technicalExternal',
            'notEligible.security',
            'notEligible.extraordinary',
        ],
    },
    paymentReceived: {
        status: ClaimStatus.PAYMENT_RECEIVED,
        title: 'paymentReceived.title',
        descriptions: [
            'paymentReceived.description',
            'paymentReceived.description2',
            'paymentReceived.description3',
        ],
    },
    paymentFailed: {
        status: ClaimStatus.PAYMENT_FAILED,
        title: 'paymentFailed.title',
        descriptions: ['paymentFailed.description'],
    },
} as const;
