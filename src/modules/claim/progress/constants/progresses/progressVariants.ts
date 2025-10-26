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
        descriptions: ['claimReceived.description'],
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
        descriptions: ['compensationApproved.description'],
    },
    compensationPaid: {
        status: ClaimStatus.PAID,
        title: 'compensationPaid.title',
        descriptions: ['compensationPaid.description'],
    },
    claimRejected: {
        status: ClaimStatus.REJECTED,
        title: 'claimRejected.title',
        descriptions: ['claimRejected.description'],
    },
    legalActionInProgress: {
        status: ClaimStatus.LEGAL_PROCESS,
        title: 'legalActionInProgress.title',
        descriptions: ['legalActionInProgress.description'],
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
} as const;
