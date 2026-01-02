import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { IFullClaim } from '../claim/interfaces/full-claim.interface';
import { Claim, ClaimStatus, Prisma } from '@prisma/client';
import { BasePassenger } from './interfaces/base-passenger.interface';

@Injectable()
export class ClaimPersistenceService {
    constructor(private readonly prisma: PrismaService) {}

    async findOneById(
        claimId: string,
        options?: { documentsWithPath: boolean },
    ): Promise<IFullClaim | null> {
        return this.prisma.claim.findFirst({
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(options),
        });
    }

    async findOneByEmail(email: string) {
        return this.prisma.claim.findFirst({
            where: {
                customer: {
                    email,
                },
            },
        });
    }

    async update(data: Partial<Claim>, claimId: string) {
        return this.prisma.claim.update({
            data,
            where: {
                id: claimId,
            },
        });
    }

    async updateHasRecentUpdate(
        data: { hasRecentUpdate: boolean },
        claimId: string,
    ) {
        return this.prisma.claim.update({
            data: {
                state: {
                    update: {
                        hasRecentUpdate: data.hasRecentUpdate,
                    },
                },
            },
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(),
        });
    }

    async updateStatus(
        newStatus: ClaimStatus,
        claimId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const client = tx ?? this.prisma;

        return client.claim.update({
            data: {
                state: {
                    update: {
                        status: newStatus,
                    },
                },
            },
            where: {
                id: claimId,
            },
        });
    }

    async getBasePassenger(passengerId: string): Promise<BasePassenger | null> {
        const claimCustomer = await this.prisma.claim.findFirst({
            where: {
                customer: {
                    id: passengerId,
                },
            },
            include: {
                customer: true,
            },
        });

        if (claimCustomer) {
            return {
                ...claimCustomer.customer,
                claimId: claimCustomer.id,
                isMinor: false,
                isCustomer: true,
            };
        }

        const otherPassenger = await this.prisma.otherPassenger.findFirst({
            where: {
                id: passengerId,
            },
        });

        return !otherPassenger
            ? null
            : {
                  ...otherPassenger,
                  isCustomer: false,
              };
    }

    async connectWithUser(claimId: string, userId: string) {
        return this.prisma.claim.update({
            data: {
                userId,
            },
            where: {
                id: claimId,
            },
        });
    }

    async updateIsPaymentRequested(
        data: {
            isPaymentRequested: boolean;
        },
        claimId: string,
    ): Promise<IFullClaim | null> {
        return this.prisma.claim.update({
            data: {
                state: {
                    update: {
                        isPaymentRequested: data.isPaymentRequested,
                    },
                },
            },
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(),
        });
    }

    private fullClaimInclude(config?: {
        fullDuplicates?: boolean;
        documentsWithPath?: boolean;
    }) {
        return {
            details: {
                include: {
                    airlines: true,
                    routes: {
                        include: {
                            ArrivalAirport: true,
                            DepartureAirport: true,
                        },
                    },
                },
            },
            state: {
                select: {
                    id: true,
                    status: true,
                    amount: true,
                    updatedAt: true,
                    isDuplicate: true,
                    hasRecentUpdate: true,
                    isPaymentRequested: true,
                    comments: true,
                    progress: {
                        orderBy: {
                            order: 'asc' as const,
                        },
                    },
                },
            },
            customer: true,
            issue: true,
            payment: true,
            documents: {
                omit: {
                    path: !config?.documentsWithPath,
                },
                where: {
                    deletedAt: null,
                },
            },
            passengers: {
                include: {
                    copiedLinks: true,
                },
            },
            agent: {
                select: {
                    email: true,
                    name: true,
                    secondName: true,
                    role: true,
                },
            },
            duplicates: config?.fullDuplicates
                ? true
                : { select: { duplicatedClaimId: true } },
            flightStatuses: true,
            documentRequests: true,
            recentUpdates: true,
        };
    }
}
