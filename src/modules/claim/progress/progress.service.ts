import { Injectable } from '@nestjs/common';
import { Prisma, Progress, ProgressStatus } from '@prisma/client';
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
            updatedBy?: string;
            comments?: string;
        },
        claimStateId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const client = tx ?? this.prisma;

        return client.progress.create({
            data: {
                ...progress,
                claimStateId,
                endAt: new Date(),
                status: ProgressStatus.COMPLETED,
            },
        });
    }

    async updateComments(comments: string, progressId: string) {
        return this.prisma.progress.update({
            where: {
                id: progressId,
            },
            data: {
                comments,
            },
        });
    }

    async getMaxProgressOrder(claimStateId: string) {
        const maxValue = await this.prisma.progress.aggregate({
            where: {
                claimStateId,
            },
            _max: {
                order: true,
            },
        });

        return maxValue._max.order;
    }
}
