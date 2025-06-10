import { ProgressStatus } from '@prisma/client';

export const defaultProgress = [
    {
        title: 'Claim Received',
        description: 'Claim has been submitted and received',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Documents Verified',
        description: 'All required documents have been verified',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Airline Contacted',
        description: 'Airline has been contacted regarding the claim',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Awaiting Response',
        description: "Waiting for airline's final response",
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Compensation Pending',
        description: 'Compensation has been approved and is pending payment',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Claim Completed',
        description: 'Compensation has been paid',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
];
