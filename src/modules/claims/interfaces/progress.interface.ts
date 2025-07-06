import { ProgressStatus } from '@prisma/client';

export interface IProgress {
    title: string;
    description: string;
    endAt: Date | null;
    status: ProgressStatus;
    order: number;
}
