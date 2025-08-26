import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CancellationNotice,
    ClaimStatus,
    DelayCategory,
    Prisma,
    UserRole,
} from '@prisma/client';
import { CreateClaimDto } from './dto/create-claim.dto';
import { IGetCompensation } from './interfaces/compensation.interface';
import { defaultProgress } from './constants/default-progress';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { IFullClaim } from './interfaces/full-claim.interface';
import { InjectQueue } from '@nestjs/bullmq';
import {
    CLAIM_QUEUE_KEY,
    FIVE_DAYS_MILLISECONDS,
    FOUR_DAYS_MILLISECONDS,
    ONE_DAY_MILLISECONDS,
    ONE_HOUR_MILLISECONDS,
    SIX_DAYS_MILLISECONDS,
    THREE_DAYS_MILLISECONDS,
    TWO_DAYS_MILLISECONDS,
} from './constants';
import { Queue } from 'bullmq';
import { IJobData } from './interfaces/job-data.interface';

@Injectable()
export class ClaimService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(CLAIM_QUEUE_KEY)
        private readonly claimFollowupQueue: Queue,
    ) {}

    scheduleClaimFollowUpEmails(jobData: IJobData) {
        const delays = [
            ONE_HOUR_MILLISECONDS,
            ONE_DAY_MILLISECONDS,
            TWO_DAYS_MILLISECONDS,
            THREE_DAYS_MILLISECONDS,
            FOUR_DAYS_MILLISECONDS,
            FIVE_DAYS_MILLISECONDS,
            SIX_DAYS_MILLISECONDS,
        ];

        delays.forEach(async (delay) => {
            await this.claimFollowupQueue.add('followUpClaim', jobData, {
                delay,
                attempts: 1,
            });
        });
    }

    async getClaim(claimId: string): Promise<IFullClaim | null> {
        return this.prisma.claim.findFirst({
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(),
        });
    }

    async updateFormState(claimId: string, formState?: string) {
        return this.prisma.claim.update({
            data: {
                formState,
            },
            where: {
                id: claimId,
            },
        });
    }

    async createClaim(
        claim: CreateClaimDto,
        language?: string,
        userId?: string | null,
        isDuplicate?: boolean,
    ): Promise<IFullClaim> {
        const maxAttempts = 5;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const numericId = this.generateNumericId();

            try {
                return await this.prisma.claim.create({
                    data: {
                        id: numericId,
                        user: userId ? { connect: { id: userId } } : undefined,
                        details: {
                            create: {
                                flightNumber: claim.details.flightNumber,
                                date: claim.details.date,
                                airlines: {
                                    create: {
                                        icao: claim.details.airline.icao,
                                        name: claim.details.airline.name,
                                    },
                                },
                                bookingRef: claim.details.bookingRef,
                                routes: {
                                    create: claim.details.routes.map((r) => ({
                                        ArrivalAirport: {
                                            create: r.arrivalAirport,
                                        },
                                        DepartureAirport: {
                                            create: r.departureAirport,
                                        },
                                        troubled: r.troubled,
                                    })),
                                },
                            },
                        },
                        state: {
                            create: {
                                amount: claim.state.amount,
                                isDuplicate,
                                progress: {
                                    create: defaultProgress,
                                },
                            },
                        },
                        customer: {
                            create: {
                                firstName: claim.customer.firstName,
                                lastName: claim.customer.lastName,
                                email: claim.customer.email,
                                phone: claim.customer.phone,
                                address: claim.customer.address,
                                city: claim.customer.city,
                                state: claim.customer.state,
                                whatsapp: claim.customer.whatsapp,
                                country: claim.customer.country,
                                language,
                            },
                        },
                        issue: {
                            create: {
                                delay: claim.issue.delay,
                                cancellationNoticeDays:
                                    claim.issue.cancellationNoticeDays,
                                disruptionType: claim.issue.disruptionType,
                                airlineReason: claim.issue.airlineReason,
                                wasAlternativeFlightOffered:
                                    claim.issue.wasAlternativeFlightOffered ||
                                    undefined,
                                arrivalTimeDelayOfAlternativeHours:
                                    claim.issue
                                        .arrivalTimeDelayOfAlternativeHours,
                                additionalInfo: claim.issue.additionalInfo,
                            },
                        },
                        payment: {
                            create: {},
                        },
                    },
                    include: this.fullClaimInclude(),
                });
            } catch (error) {
                if (
                    error instanceof Prisma.PrismaClientKnownRequestError &&
                    error.code === 'P2002'
                ) {
                    continue;
                }

                throw error;
            }
        }

        throw new Error(
            'Failed to generate unique numericId after multiple attempts.',
        );
    }

    async getClaimByEmail(email: string) {
        return this.prisma.claim.findFirst({
            where: {
                customer: {
                    email,
                },
            },
        });
    }

    async updateClaim(
        newClaim: UpdateClaimDto,
        claimId: string,
    ): Promise<IFullClaim> {
        return this.prisma.claim.update({
            data: {
                details: {
                    update: {
                        flightNumber: newClaim.details.flightNumber,
                        date: newClaim.details.date,
                        airlines: {
                            update: {
                                icao: newClaim.details.airline.icao,
                                name: newClaim.details.airline.name,
                            },
                        },
                        bookingRef: newClaim.details.bookingRef
                            ? newClaim.details.bookingRef
                            : null,
                        routes: {
                            deleteMany: {},
                            create: newClaim.details.routes.map((r) => ({
                                ArrivalAirport: { create: r.arrivalAirport },
                                DepartureAirport: {
                                    create: r.departureAirport,
                                },
                                troubled: r.troubled,
                            })),
                        },
                    },
                },
                state: {
                    update: {
                        status: newClaim.state.status,
                        amount: newClaim.state.amount,
                    },
                },
                customer: {
                    update: {
                        firstName: newClaim.customer.firstName,
                        lastName: newClaim.customer.lastName,
                        email: newClaim.customer.email,
                        phone: newClaim.customer.phone,
                        address: newClaim.customer.address,
                        city: newClaim.customer.city,
                        state: newClaim.customer.state,
                        whatsapp: newClaim.customer.whatsapp,
                        country: newClaim.customer.country,
                    },
                },
                issue: {
                    update: {
                        delay: newClaim.issue.delay,
                        cancellationNoticeDays:
                            newClaim.issue.cancellationNoticeDays,
                        disruptionType: newClaim.issue.disruptionType,
                        airlineReason: newClaim.issue.airlineReason,
                        wasAlternativeFlightOffered:
                            newClaim.issue.wasAlternativeFlightOffered ||
                            undefined,
                        arrivalTimeDelayOfAlternativeHours:
                            newClaim.issue.arrivalTimeDelayOfAlternativeHours,
                        additionalInfo: newClaim.issue.additionalInfo,
                    },
                },
                payment: {
                    update: newClaim.payment
                        ? {
                              email: newClaim.payment.email,
                              termsAgreed: newClaim.payment.termsAgreed,
                              paymentMethod: newClaim.payment.paymentMethod,
                              bankName: newClaim.payment.bankName,
                              accountName: newClaim.payment.accountName,
                              accountNumber: newClaim.payment.accountNumber,
                              iban: newClaim.payment.iban,
                              paypalEmail: newClaim.payment.paypalEmail,
                          }
                        : undefined,
                },
            },
            include: this.fullClaimInclude(),
            where: {
                id: claimId,
            },
        });
    }

    calculateCompensation(compensation: IGetCompensation): number {
        const {
            flightDistanceKm,
            delayHours,
            cancellationNoticeDays,
            wasDeniedBoarding,
            wasAlternativeFlightOffered,
            arrivalTimeDelayOfAlternative,
        } = compensation;

        if (!flightDistanceKm) {
            throw new Error('Internal error while calculating compensation');
        }

        const delayIsLessThan3h = delayHours === DelayCategory.less_than_3hours;
        const cancellationNoticeIs14daysOrMore =
            cancellationNoticeDays === CancellationNotice.fourteen_days_or_more;

        if (
            (delayIsLessThan3h && !wasDeniedBoarding) ||
            cancellationNoticeIs14daysOrMore
        ) {
            return 0;
        }

        const isEligibleDueToDelay =
            delayHours === DelayCategory.threehours_or_more ||
            delayHours === DelayCategory.never_arrived;

        const isEligibleDueToCancellation =
            cancellationNoticeDays === CancellationNotice.less_than_14days;
        const isEligibleDueToDeniedBoarding = wasDeniedBoarding;

        const eligible =
            isEligibleDueToDelay ||
            isEligibleDueToCancellation ||
            isEligibleDueToDeniedBoarding;

        if (!eligible) {
            return 0;
        }

        let baseCompensation = 0;

        if (flightDistanceKm <= 1500) {
            baseCompensation = 250;
        } else if (flightDistanceKm <= 3500) {
            baseCompensation = 400;
        } else {
            baseCompensation = 600;
        }

        if (
            isEligibleDueToCancellation &&
            wasAlternativeFlightOffered &&
            this.arrivalDelayWithinThreshold(
                flightDistanceKm,
                arrivalTimeDelayOfAlternative,
            )
        ) {
            baseCompensation = baseCompensation / 2;
        }

        return baseCompensation;
    }

    private arrivalDelayWithinThreshold(
        distance: number,
        delay: number,
    ): boolean {
        if (distance <= 1500) {
            return delay < 2;
        } else if (distance <= 3500) {
            return delay < 3;
        } else {
            return delay < 4;
        }
    }

    async getUserClaims(
        userId?: string,
        page: number = 1,
        searchParams?: {
            archived?: boolean;
            date?: {
                start: Date;
                end: Date;
            };
            status?: ClaimStatus;
            icao?: string;
            flightNumber?: string;
            role?: UserRole;
            partnerId?: string;
        },
        pageSize: number = 20,
    ): Promise<{ claims: IFullClaim[]; total: number }> {
        const skip = (page - 1) * pageSize;

        const where: Prisma.ClaimWhereInput = {
            userId,
            archived: searchParams?.archived,
        };

        if (searchParams?.status) {
            where.state = {
                status: searchParams.status,
            };
        }

        if (searchParams?.partnerId) {
            where.partnerId = searchParams.partnerId;
        }

        if (searchParams?.flightNumber) {
            where.details = {
                flightNumber: searchParams.flightNumber,
            };
        }

        if (searchParams?.icao) {
            where.details = {
                airlines: {
                    icao: searchParams.icao,
                },
            };
        }

        if (searchParams?.date) {
            where.createdAt = {
                gte: searchParams.date.start,
                lt: searchParams.date.end,
            };
        }

        if (searchParams?.role) {
            where.partner = {
                role: searchParams.role,
            };
        }

        const [claims, total] = await this.prisma.$transaction([
            this.prisma.claim.findMany({
                where,
                orderBy: {
                    createdAt: 'desc',
                },
                include: this.fullClaimInclude(),
                skip,
                take: pageSize,
            }),
            this.prisma.claim.count({
                where,
            }),
        ]);

        return {
            claims,
            total,
        };
    }

    async getUserClaimsStats(
        userId?: string,
        partnerId?: string,
    ): Promise<{
        total: number;
        successful: number;
        active: number;
        completedAmount: number;
        claimsByDay: { date: string; count: number }[];
        successByMonth: { month: string; success: string }[];
    }> {
        const [
            total,
            successful,
            active,
            completedAmountAgg,
            claimsByDay,
            successByMonth,
        ] = await this.prisma.$transaction([
            // total claims
            this.prisma.claim.count({
                where: { userId, archived: false, partnerId },
            }),

            // successful claims
            this.prisma.claim.count({
                where: {
                    userId,
                    state: {
                        status: ClaimStatus.COMPLETED,
                    },
                    archived: false,
                    partnerId,
                },
            }),

            // active claims
            this.prisma.claim.count({
                where: {
                    userId,
                    state: {
                        status: {
                            in: [ClaimStatus.PENDING, ClaimStatus.IN_PROGRESS],
                        },
                    },
                    archived: false,
                    partnerId,
                },
            }),
            // sum of ClaimState.amount where state.status = COMPLETED
            this.prisma.claimState.aggregate({
                where: {
                    status: ClaimStatus.COMPLETED,
                    Claim: { some: { userId, archived: false, partnerId } },
                },
                _sum: { amount: true },
            }),

            // claims/day
            this.prisma.$queryRaw<{ date: string; count: number }[]>`
                SELECT
                    TO_CHAR(c."created_at"::date, 'DD.MM.YYYY') AS date,
    COUNT(*) AS count
                FROM "claims" c
                WHERE
                    ${userId ? Prisma.sql`c."user_id" = ${userId} AND` : Prisma.empty}
                    ${partnerId ? Prisma.sql`c."partnerId" = ${partnerId} AND` : Prisma.empty}
                    c."archived" = false
                  AND c."created_at" >= NOW() - INTERVAL '1 month'
                GROUP BY c."created_at"::date
                ORDER BY c."created_at"::date DESC
            `,

            // success claims by month
            this.prisma.$queryRaw<{ month: string; success: number }[]>`
                SELECT
                    TO_CHAR(c."created_at", 'Mon') AS month,
    COUNT(*) AS success
                FROM "claims" c
                    INNER JOIN "claim_states" s ON c."state_id" = s."id"
                WHERE s."status" = 'COMPLETED'
                    ${userId ? Prisma.sql`AND c."user_id" = ${userId}` : Prisma.empty}
                    ${partnerId ? Prisma.sql`AND c."partnerId" = ${partnerId}` : Prisma.empty}
                  AND c."archived" = false
                GROUP BY month, date_trunc('month', c."created_at")
                ORDER BY date_trunc('month', c."created_at") DESC
            `,
        ]);

        const completedAmount = completedAmountAgg._sum.amount ?? 0;
        return {
            total,
            successful,
            active,
            completedAmount,
            claimsByDay: claimsByDay.map(({ date, count }) => ({
                date,
                count: Number(count), // <- BIGINT FIX
            })),
            successByMonth: successByMonth.map(({ month, success }) => ({
                month,
                success: success.toString(), // <- BIGINT FIX
            })),
        };
    }

    async getAirlineStats() {
        return this.prisma.airline.groupBy({
            by: ['name'],
            _count: {
                _all: true,
            },
        });
    }

    async updateStep(claimId: string, step: number): Promise<IFullClaim> {
        return this.prisma.claim.update({
            data: {
                step,
            },
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(),
        });
    }

    private fullClaimInclude() {
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
            documents: true,
            passengers: true,
            partner: {
                select: {
                    email: true,
                    name: true,
                    secondName: true,
                    role: true,
                },
            },
        };
    }

    generateNumericId(length = 6): string {
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
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

    async changeUpdatedAt(claimId: string) {
        return this.prisma.claim.update({
            data: {
                updatedAt: new Date(),
            },
            where: {
                id: claimId,
            },
        });
    }

    async setArchived(claimId: string, archived: boolean) {
        return this.prisma.claim.update({
            data: { archived },
            where: {
                id: claimId,
            },
        });
    }

    async updateContinueLink(claimId: string, continueLink: string) {
        return this.prisma.claim.update({
            data: {
                continueLink,
            },
            where: {
                id: claimId,
            },
        });
    }

    async searchClaims(search: string, partnerId?: string, page: number = 20) {
        const normalized = search.replace(/\s+/g, '');

        const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
            SELECT "claims"."id"
            FROM "claims"
                     LEFT JOIN "claim_customers" ON "claims"."customer_id" = "claim_customers"."id"
                     LEFT JOIN "claim_details" ON "claim_details"."id" = "claims"."details_id"
            WHERE (
                REPLACE("claim_details"."booking_ref", ' ', '') ILIKE ${`%${normalized}%`}
                        OR REPLACE("claim_details"."flight_number", ' ', '') ILIKE ${`%${normalized}%`}
                        OR REPLACE("claim_customers"."phone", ' ', '') ILIKE ${`%${normalized}%`}
                        OR REPLACE("claim_customers"."email", ' ', '') ILIKE ${`%${normalized}%`}
                        OR REPLACE("claim_customers"."first_name", ' ', '') ILIKE ${`%${normalized}%`}
                        OR REPLACE("claim_customers"."last_name", ' ', '') ILIKE ${`%${normalized}%`}
                        OR REPLACE("claims"."id"::text, ' ', '') ILIKE ${`%${normalized}%`}
                )
              AND (${partnerId ?? null}::text IS NULL OR "claims"."partnerId" = ${partnerId ?? null}::text)
            ORDER BY "claims"."created_at" DESC
                LIMIT ${page}
        `;

        return this.prisma.claim.findMany({
            where: { id: { in: ids.map((i) => i.id) } },
            include: this.fullClaimInclude(),
            orderBy: {
                createdAt: 'desc',
            },
            take: page,
        });
    }

    async addPartner(
        claimId: string,
        userId: string | null,
    ): Promise<IFullClaim> {
        return this.prisma.claim.update({
            where: {
                id: claimId,
            },
            data: {
                partnerId: userId,
            },
            include: this.fullClaimInclude(),
        });
    }

    async findDuplicate(claimData: {
        firstName: string;
        lastName: string;
        email: string;
        flightNumber: string;
    }) {
        return this.prisma.claim.findFirst({
            where: {
                customer: {
                    firstName: claimData.firstName,
                    lastName: claimData.lastName,
                    email: claimData.email,
                },
                details: {
                    flightNumber: claimData.flightNumber,
                },
            },
        });
    }
}
