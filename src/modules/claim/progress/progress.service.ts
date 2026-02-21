import { Injectable } from '@nestjs/common';
import { ClaimStatus, Prisma, Progress } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { REFERRAL_RATE } from '../../referral/referral-transaction/constants';
import { IFullClaim } from '../../claim-persistence/types/claim-persistence.types';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';

@Injectable()
export class ProgressService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    async getProgressById(progressId: string): Promise<Progress | null> {
        return this.prisma.progress.findFirst({
            where: {
                id: progressId,
            },
            include: this.getProgressFullInclude(),
        });
    }

    async deleteProgress(progressId: string) {
        return this.prisma.progress.delete({
            where: {
                id: progressId,
            },
            include: this.getProgressFullInclude(),
        });
    }

    async createProgress(
        data: {
            title: string;
            description: string;
            order: number;
            updatedBy?: string;
            comments?: string;
            descriptionVariables: { key: string; value: string }[];
            passengerIds: string[];
            newStatus: ClaimStatus;
            claimId: string;
        },
        claimStateId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const client = tx ?? this.prisma;

        await Promise.all(
            data.passengerIds.map(async (passengerId) => {
                await this.claimPersistenceService.updateStatus(
                    {
                        newStatus: data.newStatus,
                        claimId: data.claimId,
                        passengerId: passengerId,
                    },
                    client,
                );
            }),
        );

        return client.progress.create({
            data: {
                title: data.title,
                description: data.description,
                order: data.order,
                updatedBy: data.updatedBy,
                comments: data.comments,
                passengerIds: data.passengerIds,
                claimStateId,
                endAt: new Date(),
                descriptionVariables: JSON.stringify(data.descriptionVariables),
            },
            include: this.getProgressFullInclude(),
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
            include: this.getProgressFullInclude(),
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

    private getProgressFullInclude() {
        return {
            user: {
                select: {
                    name: true,
                    secondName: true,
                    role: true,
                },
            },
        } as const;
    }
}
