export const Progresses = {
    'Claim Received': {
        description: 'Claim has been submitted and received',
    },
    'Documents Verified': {
        description: 'All required documents have been verified',
    },
    'Airline Contacted': {
        description: 'Airline has been contacted regarding the claim',
    },
    'Awaiting Response': {
        description: "Waiting for airline's final response",
    },
    'Compensation Pending': {
        description: 'Compensation has been approved and is pending payment',
    },
    'Claim Completed': {
        description: 'Compensation has been paid',
    },
} as const;
