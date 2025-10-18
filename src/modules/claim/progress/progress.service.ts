import { Injectable } from '@nestjs/common';
import { Progress, ProgressStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ProgressService {
    constructor(private readonly prisma: PrismaService) {}

    async getProgressById(progressId: string): Promise<Progress | null> {
        return this.prisma.progress.findFirst({
            where: {
                id: progressId,
            },
        });
    }

    async deleteProgress(progressId: string) {
        return this.prisma.progress.delete({
            where: {
                id: progressId,
            },
        });
    }

    async createProgressByClaimId(
        progress: {
            title: string;
            description: string;
            order: number;
            updatedBy: string;
        },
        claimStateId: string,
    ) {
        return this.prisma.progress.create({
            data: {
                ...progress,
                claimStateId,
                endAt: new Date(),
                status: ProgressStatus.COMPLETED,
            },
        });
    }
}
