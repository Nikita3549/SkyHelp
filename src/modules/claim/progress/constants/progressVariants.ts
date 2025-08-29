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
        title: 'Claim Received',
        description: 'We have received your claim and started reviewing it.',
    },
    missingInformation: {
        status: ClaimStatus.MISSING_INFO,
        title: 'Missing Information',
        description:
            'Some information is missing. Please upload the requested documents.',
    },
    additionalDocumentsRequired: {
        status: ClaimStatus.DOCS_REQUESTED,
        title: 'Additional Documents Required',
        description:
            'The airline requested additional documents. We’ll notify you of the results.',
    },
    claimSubmittedToAirline: {
        status: ClaimStatus.SENT_TO_AIRLINE,
        title: 'Claim Submitted to Airline',
        description:
            'Your claim has been submitted to the airline for assessment.',
    },
    awaitingAirlineResponse: {
        status: ClaimStatus.WAITING_AIRLINE,
        title: 'Awaiting Airline Response',
        description:
            "We are waiting for the airline's response. This may take several weeks.",
    },
    compensationApproved: {
        status: ClaimStatus.APPROVED,
        title: 'Compensation Approved',
        description:
            'Your compensation was approved. Waiting for the airline to send payment.',
    },
    compensationPaid: {
        status: ClaimStatus.PAID,
        title: 'Compensation Paid',
        description:
            'The airline has paid the compensation. The payment has already been sent to your bank account.\n' +
            'Please allow up to 7 business days for the transfer to be completed.',
    },
    claimRejected: {
        status: ClaimStatus.REJECTED,
        title: 'Claim Rejected',
        description:
            'The airline refused to compensate. We’re reviewing next steps.',
    },
    legalActionInProgress: {
        status: ClaimStatus.LEGAL_PROCESS,
        title: 'Legal Action In Progress',
        description:
            "Your case was escalated to legal. We'll keep you updated.",
    },
    closedWithoutResolution: {
        status: ClaimStatus.CLOSED,
        title: 'Closed Without Resolution',
        description:
            'Case closed due to missing documents, eligibility, or by your request.',
    },
    notEligible: {
        status: ClaimStatus.NOT_ELIGIBLE,
        title: 'Not Eligible',
        description: 'Your case does not qualify under EU Regulation 261/2004.',
    },
} as const;
