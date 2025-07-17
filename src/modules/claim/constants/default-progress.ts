import { ProgressStatus } from '@prisma/client';

export const defaultProgress = [
    {
        title: 'Claim Received',
        order: 1,
        description: 'Claim has been submitted and received',
        endAt: null,
        status: ProgressStatus.COMPLETED,
    },
    {
        title: 'Documents Verified',
        order: 2,
        description: 'All required documents have been verified',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Airline Contacted',
        order: 3,
        description: 'Airline has been contacted regarding the claim',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Awaiting Response',
        order: 4,
        description: "Waiting for airline's final response",
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Compensation Pending',
        order: 5,
        description: 'Compensation has been approved and is pending payment',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Claim Completed',
        order: 6,
        description: 'Compensation has been paid',
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
];
