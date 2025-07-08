import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CancellationNotice,
    Claim,
    ClaimStatus,
    DelayCategory,
    Document,
    Prisma,
    Progress,
} from '@prisma/client';
import { CreateClaimDto } from './dto/create-claim.dto';
import { IGetCompensation } from './interfaces/compensation.interface';
import { defaultProgress } from './constants/default-progress';
import { IProgress } from './interfaces/progress.interface';
import { UpdateClaimDto } from './dto/update-claim.dto';
import { CustomerDto } from './dto/update-parts/customer.dto';
import { FlightDto } from './dto/update-parts/flight.dto';
import { IssueDto } from './dto/update-parts/issue.dto';
import { PaymentDto } from './dto/update-parts/payment.dto';
import { StateDto } from './dto/update-parts/state.dto';
import { IFullClaim } from './interfaces/full-claim.interface';

@Injectable()
export class ClaimsService {
    constructor(private readonly prisma: PrismaService) {}

    async getClaim(claimId: string): Promise<IFullClaim | null> {
        return this.prisma.claim.findFirst({
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(),
        });
    }

    async getDocument(documentId: string): Promise<Document | null> {
        return this.prisma.document.findFirst({
            where: {
                id: documentId,
            },
        });
    }

    async saveDocuments(
        documents: Omit<Omit<Document, 'id'>, 'claimId'>[],
        claimId: string,
    ) {
        return this.prisma.document.createMany({
            data: documents.map((doc) => ({
                name: doc.name,
                path: doc.path,
                claimId,
            })),
        });
    }

    async createClaim(
        claim: CreateClaimDto,
        userId: string | null,
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
                                secondAddress: claim.customer.secondAddress,
                                city: claim.customer.city,
                                postalCode: claim.customer.postalCode,
                                state: claim.customer.state,
                                country: claim.customer.country,
                                whatsapp: claim.customer.whatsapp,
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
                        secondAddress: newClaim.customer.secondAddress,
                        city: newClaim.customer.city,
                        postalCode: newClaim.customer.postalCode,
                        state: newClaim.customer.state,
                        country: newClaim.customer.country,
                        whatsapp: newClaim.customer.whatsapp,
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
            wasDisruptionDuoExtraordinaryCircumstances,
        } = compensation;

        if (!flightDistanceKm) {
            throw new Error('Internal error while calculating compensation');
        }

        const delayIsLessThan3h = delayHours === DelayCategory.less_than_3hours;
        const cancellationNoticeIs14daysOrMore =
            cancellationNoticeDays === CancellationNotice.fourteen_days_or_more;
        const isExtraordinary = wasDisruptionDuoExtraordinaryCircumstances;

        if (
            (delayIsLessThan3h && !wasDeniedBoarding) ||
            cancellationNoticeIs14daysOrMore ||
            isExtraordinary
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

    async updateProgress(
        progress: IProgress,
        progressId: string,
    ): Promise<Progress> {
        return this.prisma.progress.update({
            data: progress,
            where: {
                id: progressId,
            },
        });
    }
    async getUserClaims(
        userId?: string,
        page: number = 1,
        pageSize: number = 20,
    ): Promise<IFullClaim[]> {
        const skip = (page - 1) * pageSize;

        return this.prisma.claim.findMany({
            where: {
                userId,
            },
            include: this.fullClaimInclude(),
            skip,
            take: pageSize,
        });
    }

    async getUserClaimsStats(
        userId?: string,
        page = 1,
        pageSize = 20,
    ): Promise<{
        total: number;
        successful: number;
        active: number;
        completedAmount: number;
        successByMonth: { month: string; success: string }[];
    }> {
        // const skip = (page - 1) * pageSize;

        const [total, successful, active, completedAmountAgg] =
            await this.prisma.$transaction([
                // page data
                // this.prisma.claim.findMany({
                //     where: { userId },
                //     include: this.fullClaimInclude(),
                //     skip,
                //     take: pageSize,
                // }),
                // total claims
                this.prisma.claim.count({ where: { userId } }),

                // successful claims
                this.prisma.claim.count({
                    where: {
                        userId,
                        state: {
                            status: ClaimStatus.COMPLETED,
                        },
                    },
                }),

                // active claims
                this.prisma.claim.count({
                    where: {
                        userId,
                        state: {
                            status: {
                                in: [
                                    ClaimStatus.PENDING,
                                    ClaimStatus.IN_PROGRESS,
                                ],
                            },
                        },
                    },
                }),
                // sum of ClaimState.amount where state.status = COMPLETED
                this.prisma.claimState.aggregate({
                    where: {
                        status: ClaimStatus.COMPLETED,
                        Claim: { some: { userId } },
                    },
                    _sum: { amount: true },
                }),
            ]);

        const successByMonth = await this.prisma.$queryRaw<
            { month: string; success: number }[]
        >`
            SELECT
                TO_CHAR(c."created_at", 'Mon') AS month,
    COUNT(*) AS success
            FROM "claims" c
                INNER JOIN "claim_states" s ON c."state_id" = s."id"
            WHERE s."status" = 'COMPLETED'
                ${userId ? Prisma.sql`AND c."user_id" = ${userId}` : Prisma.empty}
            GROUP BY month, date_trunc('month', c."created_at")
            ORDER BY date_trunc('month', c."created_at") DESC
        `;

        const completedAmount = completedAmountAgg._sum.amount ?? 0;
        return {
            total,
            successful,
            active,
            completedAmount,
            successByMonth: successByMonth.map(({ month, success }) => ({
                month,
                success: success.toString(),
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

    async updateEnvelopeId(
        claimId: string,
        envelopeId: string,
    ): Promise<IFullClaim> {
        return this.prisma.claim.update({
            data: {
                envelopeId,
            },
            where: {
                id: claimId,
            },
            include: this.fullClaimInclude(),
        });
    }

    async getClaimByEnvelopeId(envelopeId: string): Promise<IFullClaim | null> {
        return this.prisma.claim.findFirst({
            where: {
                envelopeId,
            },
            include: this.fullClaimInclude(),
        });
    }

    async doesAssignmentAgreementExist(claimId: string) {
        return this.prisma.document.count({
            where: {
                claimId,
                name: 'assignment_agreement.pdf',
            },
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
        };
    }

    generateNumericId(length = 6): string {
        const min = Math.pow(10, length - 1);
        const max = Math.pow(10, length) - 1;
        return Math.floor(Math.random() * (max - min + 1) + min).toString();
    }

    async updateCustomer(dto: CustomerDto, claimId: string) {
        return this.prisma.claimCustomer.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { customerId: true },
                    })
                ).customerId,
            },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: dto.phone,
                address: dto.address,
            },
        });
    }
    async updateFlight(dto: FlightDto, claimId: string) {
        return this.prisma.claimDetails.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { detailsId: true },
                    })
                ).detailsId,
            },
            data: {
                flightNumber: dto.flightNumber,
                date: new Date(dto.date),
                airlines: {
                    update: {
                        name: dto.airline,
                    },
                },
                routes: {
                    deleteMany: {},
                    create: dto.routes.map((r) => ({
                        ArrivalAirport: {
                            create: {
                                name: r.arrivalAirport,
                                icao: r.arrivalIcao,
                            },
                        },
                        DepartureAirport: {
                            create: {
                                name: r.departureAirport,
                                icao: r.departureIcao,
                            },
                        },
                        troubled: r.troubled,
                    })),
                },
            },
        });
    }
    async updateIssue(dto: IssueDto, claimId: string) {
        return this.prisma.claimIssue.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { issueId: true },
                    })
                ).issueId,
            },
            data: {
                disruptionType: dto.flightIssue,
                airlineReason: dto.reasonGivenByAirline,
                additionalInfo: dto.additionalInformation,
            },
        });
    }
    async updatePayment(dto: PaymentDto, claimId: string) {
        return this.prisma.claimPayment.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { paymentId: true },
                    })
                ).paymentId as string,
            },
            data: {
                paymentMethod: dto.paymentMethod,
                accountName: dto.accountName,
                accountNumber: dto.accountNumber,
                email: dto.email,
                iban: dto.iban,
                paypalEmail: dto.paypalEmail,
                bankName: dto.bankName,
            },
        });
    }
    async updateState(dto: StateDto, claimId: string) {
        return this.prisma.claimState.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { stateId: true },
                    })
                ).stateId,
            },
            data: {
                amount: dto.amount,
                status: dto.status,
            },
        });
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
}
