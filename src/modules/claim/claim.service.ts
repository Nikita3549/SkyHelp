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
import { defaultProgress } from './progress/constants/progresses/default-progress';
import { UpdateClaimDto } from './dto/update-claim.dto';
import {
    IFullClaim,
    IFullClaimWithJwt,
} from './interfaces/full-claim.interface';
import { InjectQueue } from '@nestjs/bullmq';
import {
    CLAIM_FOLLOWUP_QUEUE_KEY,
    CONTINUE_LINKS_EXP,
    FIVE_DAYS,
    FOUR_DAYS,
    SIX_DAYS,
    THREE_DAYS,
    TWO_DAYS,
} from './constants';
import { Queue } from 'bullmq';
import { IJobClaimFollowupData } from './interfaces/job-data.interface';
import { BasePassenger } from './interfaces/base-passenger.interface';
import { ConfigService } from '@nestjs/config';
import { IClaimJwt } from './interfaces/claim-jwt.interface';
import { TokenService } from '../token/token.service';
import { normalizePhone } from '../../utils/normalizePhone';
import { DAY, HOUR } from '../../common/constants/time.constants';
import { getNextWorkTime } from '../../utils/getNextWorkTime';
import { generateNumericId } from '../../utils/generateNumericId';
import { IAffiliateClaim } from './interfaces/affiliate-claim.interface';
import { IAccountantClaim } from './interfaces/accountant-claim.interface';
import { ViewClaimType } from './enums/view-claim-type.enum';

@Injectable()
export class ClaimService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(CLAIM_FOLLOWUP_QUEUE_KEY)
        private readonly claimFollowupQueue: Queue,
        private readonly configService: ConfigService,
        private readonly tokenService: TokenService,
    ) {}

    scheduleClaimFollowUpEmails(jobData: IJobClaimFollowupData) {
        const delays = [
            HOUR,
            DAY,
            TWO_DAYS,
            THREE_DAYS,
            FOUR_DAYS,
            FIVE_DAYS,
            SIX_DAYS,
        ];

        delays.forEach(async (delay) => {
            await this.claimFollowupQueue.add('followUpClaim', jobData, {
                delay: getNextWorkTime(delay),
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
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

    async updateDuplicates(claimIds: string[], duplicateId: string) {
        await this.prisma.duplicatedClaim.createMany({
            data: claimIds.map((claimId) => ({
                claimId: claimId,
                duplicatedClaimId: duplicateId,
            })),
            skipDuplicates: true,
        });
    }

    async createClaim(
        claimData: CreateClaimDto,
        extraData: {
            language?: string;
            referrer?: string;
            referredById: string | null;
            referrerSource?: string;
            userId?: string | null;
            flightNumber: string;
            fullRoutes: {
                troubled: boolean | undefined;
                departureAirport: {
                    icao: string;
                    iata: string;
                    name: string;
                    country: string;
                };
                arrivalAirport: {
                    icao: string;
                    iata: string;
                    name: string;
                    country: string;
                };
            }[];
        },
    ): Promise<IFullClaimWithJwt> {
        const {
            language,
            userId,
            flightNumber,
            referrer,
            referrerSource,
            fullRoutes,
            referredById,
        } = extraData;

        const duplicatedClaims = await this.findDuplicate({
            email: claimData.customer.email,
            firstName: claimData.customer.firstName,
            lastName: claimData.customer.lastName,
            flightNumber: claimData.details.flightNumber,
        });

        const maxAttempts = 5;
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            const numericId = generateNumericId();

            const jwt = this.tokenService.generateJWT<IClaimJwt>(
                {
                    claimId: numericId,
                },
                { expiresIn: CONTINUE_LINKS_EXP },
            );
            const continueClaimLink = `${this.configService.getOrThrow('FRONTEND_URL')}/claim?claimId=${numericId}&jwt=${jwt}`;

            try {
                const claim = await this.prisma.claim.create({
                    data: {
                        id: numericId,
                        ...(userId
                            ? { user: { connect: { id: userId } } }
                            : {}),
                        ...(referredById
                            ? { referredBy: { connect: { id: referredById } } }
                            : {}),
                        referrer,
                        referrerSource,
                        continueLink: continueClaimLink,
                        duplicates: {
                            create: duplicatedClaims.map((claim) => ({
                                duplicatedClaimId: claim.id,
                            })),
                        },
                        details: {
                            create: {
                                flightNumber,
                                date: claimData.details.date,
                                airlines: {
                                    create: {
                                        icao: claimData.details.airline.icao,
                                        name: claimData.details.airline.name,
                                        iata: claimData.details.airline.iata,
                                    },
                                },
                                bookingRef: claimData.details.bookingRef,
                                routes: {
                                    create: fullRoutes.map((r) => ({
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
                                amount: claimData.state.amount,
                                progress: { create: defaultProgress },
                                isDuplicate: duplicatedClaims.length > 0,
                            },
                        },
                        customer: {
                            create: {
                                firstName: claimData.customer.firstName,
                                lastName: claimData.customer.lastName,
                                email: claimData.customer.email,
                                phone:
                                    normalizePhone(claimData.customer.phone) ||
                                    '-',
                                address: claimData.customer.address,
                                city: claimData.customer.city,
                                state: claimData.customer.state,
                                whatsapp: claimData.customer.whatsapp,
                                country: claimData.customer.country,
                                language,
                            },
                        },
                        issue: {
                            create: {
                                delay: claimData.issue.delay,
                                cancellationNoticeDays:
                                    claimData.issue.cancellationNoticeDays,
                                disruptionType: claimData.issue.disruptionType,
                                airlineReason: claimData.issue.airlineReason,
                                wasAlternativeFlightOffered:
                                    claimData.issue
                                        .wasAlternativeFlightOffered ||
                                    undefined,
                                arrivalTimeDelayOfAlternativeHours:
                                    claimData.issue
                                        .arrivalTimeDelayOfAlternativeHours,
                                additionalInfo: claimData.issue.additionalInfo,
                                hasContactedAirline:
                                    claimData.issue.hasContactedAirline,
                            },
                        },
                        payment: { create: {} },
                    },
                    include: this.fullClaimInclude(),
                });

                await this.updateDuplicates(
                    duplicatedClaims.map((claim) => claim.id),
                    claim.id,
                );

                return {
                    ...claim,
                    jwt,
                };
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
                        bookingRef: newClaim.details.bookingRef
                            ? newClaim.details.bookingRef
                            : null,
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
            date?: { start: Date; end: Date };
            status?: ClaimStatus;
            icao?: string;
            flightNumber?: string;
            role?: UserRole;
            agentId?: string;
            duplicated?: boolean;
            isOrderByAssignedAt?: boolean;
            onlyRecentlyUpdates?: boolean;
            phone?: string;
            email?: string;
            referralCode?: string;
            viewType?: ViewClaimType;
        },
        pageSize: number = 20,
    ): Promise<{
        claims: IFullClaim[] | IAffiliateClaim[] | IAccountantClaim[];
        total: number;
    }> {
        const skip = (page - 1) * pageSize;

        const where: Prisma.ClaimWhereInput = {
            userId,
            archived: searchParams?.archived,
            state: {},
            details: { airlines: {} },
            customer: {},
        };

        let orderBy: Prisma.ClaimOrderByWithRelationInput = {
            createdAt: 'desc',
        };

        if (searchParams?.duplicated) where.duplicates = { some: {} };
        if (searchParams?.referralCode)
            where.referrer = searchParams.referralCode;
        if (searchParams?.phone) where.customer!.phone = searchParams.phone;
        if (searchParams?.email) where.customer!.email = searchParams.email;
        if (searchParams?.onlyRecentlyUpdates)
            where.state!.hasRecentUpdate = searchParams.onlyRecentlyUpdates;
        if (searchParams?.status) where.state!.status = searchParams.status;
        if (searchParams?.agentId) where.agentId = searchParams.agentId;
        if (searchParams?.flightNumber)
            where.details!.flightNumber = searchParams.flightNumber;
        if (searchParams?.icao)
            where.details!.airlines!.icao = searchParams.icao;
        if (searchParams?.date)
            where.createdAt = {
                gte: searchParams.date.start,
                lt: searchParams.date.end,
            };
        if (searchParams?.role) where.agent = { role: searchParams.role };

        if (searchParams?.onlyRecentlyUpdates)
            orderBy = { recentUpdatedAt: 'desc' };
        if (searchParams?.isOrderByAssignedAt) orderBy = { assignedAt: 'desc' };

        const include = this.getClaimInclude(searchParams?.viewType);

        const [claims, total] = await this.prisma.$transaction([
            this.prisma.claim.findMany({
                where,
                orderBy,
                include,
                skip,
                take: pageSize,
            }),
            this.prisma.claim.count({ where }),
        ]);

        return {
            claims: claims as
                | IFullClaim[]
                | IAffiliateClaim[]
                | IAccountantClaim[],
            total,
        };
    }

    private getClaimInclude(viewType?: ViewClaimType) {
        switch (viewType) {
            case ViewClaimType.AFFILIATE:
                return this.affiliateClaimInclude();
            case ViewClaimType.ACCOUNTANT:
                return this.accountantClaimInclude();
            default:
                return this.fullClaimInclude();
        }
    }

    async getUserClaimsStats(
        userId?: string,
        agentId?: string,
        dateFilter?: { dateFrom: Date; dateTo: Date },
    ): Promise<{
        total: number;
        successful: number;
        active: number;
        completedAmount: number;
        claimsByDay: { date: string; count: number }[];
        successByMonth: { month: string; success: string }[];
        airlines: { count: number; name: string }[];
    }> {
        const dateWhere = dateFilter
            ? { gte: dateFilter.dateFrom, lte: dateFilter.dateTo }
            : undefined;

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
                where: {
                    userId,
                    agentId,
                    archived: false,
                    ...(dateWhere ? { createdAt: dateWhere } : {}),
                },
            }),

            // successful claims
            this.prisma.claim.count({
                where: {
                    userId,
                    agentId,
                    archived: false,
                    state: { status: ClaimStatus.PAID },
                    ...(dateWhere ? { createdAt: dateWhere } : {}),
                },
            }),

            // active claims
            this.prisma.claim.count({
                where: {
                    userId,
                    agentId,
                    archived: false,
                    state: {
                        status: {
                            notIn: [
                                ClaimStatus.PAID,
                                ClaimStatus.CLOSED,
                                ClaimStatus.NOT_ELIGIBLE,
                            ],
                        },
                    },
                    ...(dateWhere ? { createdAt: dateWhere } : {}),
                },
            }),

            // sum of ClaimState.amount where state.status = PAID
            this.prisma.claimState.aggregate({
                where: {
                    status: ClaimStatus.PAID,
                    Claim: {
                        some: {
                            userId,
                            agentId,
                            archived: false,
                            ...(dateWhere ? { createdAt: dateWhere } : {}),
                        },
                    },
                },
                _sum: { amount: true },
            }),

            // claims/day
            this.prisma.$queryRaw<{ date: string; count: number }[]>`
                SELECT TO_CHAR(c."created_at"::date, 'DD.MM.YYYY') AS date, COUNT(*) AS count
                FROM "claims" c
                WHERE ${userId ? Prisma.sql`c."user_id" = ${userId} AND` : Prisma.empty}
                      ${agentId ? Prisma.sql`c."agent_id" = ${agentId} AND` : Prisma.empty}
                    c."archived" = false
                      ${dateFilter ? Prisma.sql`AND c."created_at" >= ${dateFilter.dateFrom} AND c."created_at" <= ${dateFilter.dateTo}` : Prisma.empty}
                GROUP BY c."created_at"::date
                ORDER BY c."created_at"::date DESC
            `,

            // success claims by month
            this.prisma.$queryRaw<{ month: string; success: number }[]>`
                  SELECT TO_CHAR(c."created_at", 'Mon') AS month, COUNT(*) AS success
                  FROM "claims" c
                      INNER JOIN "claim_states" s
                  ON c."state_id" = s."id"
                  WHERE s."status" = 'COMPLETED' ${userId ? Prisma.sql`AND c."user_id" = ${userId}` : Prisma.empty} ${agentId ? Prisma.sql`AND c."agent_id" = ${agentId}` : Prisma.empty}
                    AND c."archived" = false ${dateFilter ? Prisma.sql`AND c."created_at" >= ${dateFilter.dateFrom} AND c."created_at" <= ${dateFilter.dateTo}` : Prisma.empty}
                  GROUP BY month, date_trunc('month', c."created_at")
                  ORDER BY date_trunc('month', c."created_at") DESC`,
        ]);

        // airlines
        const airlines = await this.prisma.airline.groupBy({
            by: ['name'],
            _count: { _all: true },
            where: {
                Details: {
                    some: {
                        Claim: {
                            some: {
                                archived: false,
                            },
                        },
                    },
                },
            },
        });

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
            airlines: airlines.map((s) => ({
                name: s.name,
                count: Number(s._count._all), // <- BIGINT FIX
            })),
        };
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

    private affiliateClaimInclude() {
        return {
            step: false,
            formState: false,
            userId: false,
            agentId: false,
            assignedAt: false,
            detailsId: false,
            stateId: false,
            customerId: false,
            issueId: false,
            envelopeId: false,
            continueLink: false,
            paymentId: false,
            updatedAt: false,
            recentUpdatedAt: false,
            referredById: false,
            details: {
                include: {
                    airlines: true,
                },
            },
            state: {
                select: {
                    id: true,
                    status: true,
                    amount: true,
                    updatedAt: true,
                    comments: true,
                    progress: {
                        orderBy: {
                            order: 'asc' as const,
                        },
                    },
                },
            },
            customer: {
                select: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            passengers: {
                select: {
                    id: true,
                    isMinor: true,
                },
            },
            duplicates: true,
        };
    }

    private accountantClaimInclude() {
        return {
            step: false,
            formState: false,
            userId: false,
            agentId: false,
            assignedAt: false,
            detailsId: false,
            stateId: false,
            customerId: false,
            issueId: false,
            envelopeId: false,
            continueLink: false,
            paymentId: false,
            updatedAt: false,
            recentUpdatedAt: false,
            referredById: false,
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
                    comments: true,
                    progress: {
                        orderBy: {
                            order: 'asc' as const,
                        },
                    },
                },
            },
            customer: true,
            documents: {
                omit: {
                    path: true,
                },
            },
            passengers: {
                select: {
                    id: true,
                    isMinor: true,
                },
            },
            duplicates: true,
            payment: true,
        };
    }

    private fullClaimInclude(config?: { fullDuplicates: boolean }) {
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
                    path: true,
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
        return this.prisma.claim.updateMany({
            data: {
                updatedAt: new Date(),
            },
            where: {
                id: claimId,
            },
        });
    }

    async changeRecentUpdatedAt(claimId: string) {
        return this.prisma.claim.update({
            data: {
                recentUpdatedAt: new Date(),
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

    async searchClaims(search: string, agentId?: string, page: number = 20) {
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
              OR REPLACE(CONCAT("claim_customers"."first_name", "claim_customers"."last_name"), ' ', '') ILIKE ${`%${normalized}%`}
          )
          AND (${agentId ?? null}::text IS NULL OR "claims"."agent_id" = ${agentId ?? null}::text)
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

    async addAgent(
        claimId: string,
        userId: string | null,
    ): Promise<IFullClaim> {
        return this.prisma.claim.update({
            where: {
                id: claimId,
            },
            data: {
                assignedAt: new Date(),
                agentId: userId,
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
        return this.prisma.claim.findMany({
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

    async updateHasRecentUpdate(hasRecentUpdate: boolean, claimId: string) {
        return this.prisma.claim.update({
            data: {
                state: {
                    update: {
                        hasRecentUpdate,
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

    async getCustomerOrOtherPassengerById(
        passengerId: string,
    ): Promise<BasePassenger | null> {
        const customer = await this.prisma.claimCustomer.findFirst({
            where: {
                id: passengerId,
            },
        });

        if (customer) {
            return {
                id: customer.id,
                firstName: customer.firstName,
                lastName: customer.lastName,
                city: customer.city,
                country: customer.country,
                address: customer.address,
                email: customer.email,
                isSigned: !!customer.isSigned,
                isMinor: false,
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
                  id: otherPassenger.id,
                  firstName: otherPassenger.firstName,
                  lastName: otherPassenger.lastName,
                  city: otherPassenger.city,
                  country: otherPassenger.country,
                  address: otherPassenger.address,
                  email: otherPassenger.email,
                  isSigned: !!otherPassenger.isSigned,
                  isMinor: otherPassenger.isMinor,
              };
    }

    async deleteDuplicates(claimIds: string[]) {
        if (!claimIds.length) return;

        await this.prisma.duplicatedClaim.deleteMany({
            where: {
                claimId: {
                    in: claimIds,
                },
            },
        });
    }

    async updateIsPaymentRequested(
        isPaymentRequested: boolean,
        claimId: string,
    ): Promise<IFullClaim | null> {
        return this.prisma.claim.update({
            data: {
                state: {
                    update: {
                        isPaymentRequested,
                    },
                },
            },
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(),
        });
    }
}
