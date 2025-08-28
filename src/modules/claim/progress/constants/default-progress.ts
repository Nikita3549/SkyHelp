import { ProgressStatus } from '@prisma/client';
import { Progresses } from './progresses';

export const defaultProgress = [
    {
        title: 'Claim Received',
        description: Progresses['Claim Received'].description,
        order: 1,
        endAt: new Date(),
        status: ProgressStatus.COMPLETED,
    },
    {
        title: 'Documents Verified',
        description: Progresses['Documents Verified'].description,
        order: 2,
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Airline Contacted',
        description: Progresses['Airline Contacted'].description,
        order: 3,
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Awaiting Response',
        description: Progresses['Awaiting Response'].description,
        order: 4,
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Compensation Pending',
        description: Progresses['Compensation Pending'].description,
        order: 5,
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
    {
        title: 'Claim Completed',
        description: Progresses['Claim Completed'].description,
        order: 6,
        endAt: null,
        status: ProgressStatus.IN_PROCESS,
    },
];
