import { ProgressStatus } from '@prisma/client';
import { ProgressVariants } from './progressVariants';

export const defaultProgress = [
    {
        title: ProgressVariants.claimReceived.title,
        description: ProgressVariants.claimReceived.descriptions[0],
        order: 1,
        endAt: new Date(),
        status: ProgressStatus.COMPLETED,
    },
];
