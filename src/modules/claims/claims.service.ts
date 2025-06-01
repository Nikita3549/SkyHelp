import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    CancellationNotice,
    Claim,
    DelayCategory,
    Document,
    Progress,
} from '@prisma/client';
import { CreateClaimDto } from './dto/create-claim.dto';
import { IGetCompensation } from './interfaces/compensation.interface';
import { defaultProgress } from './constants/default-progress';
import { IProgress } from './interfaces/progress.interface';
import { UpdateClaimDto } from './dto/update-claim.dto';

@Injectable()
export class ClaimsService {
    constructor(private readonly prisma: PrismaService) {}
    async getClaim(claimId: string): Promise<Claim | null> {
        return this.prisma.claim.findFirst({
            where: {
                id: claimId,
            },
        });
    }

    async saveDocuments(
        documents: Omit<Omit<Document, 'id'>, 'claimId'>[],
        claimId: string,
    ) {
        return this.prisma.document.createMany({
            data: documents.map((doc) => {
                return {
                    name: doc.name,
                    path: doc.path,
                    claimId,
                };
            }),
        });
    }

    async createClaim(claim: CreateClaimDto, userId: string): Promise<Claim> {
        return this.prisma.claim.create({
            data: {
                user: {
                    connect: { id: userId },
                },
                details: {
                    create: {
                        flightNumber: claim.details.flightNumber,
                        date: claim.details.date,
                        airline: claim.details.airline,
                        bookingRef: claim.details.bookingRef,
                        routes: {
                            create: claim.details.routes.map((r) => ({
                                arrivalAirport: r.arrivalAirport,
                                departureAirport: r.departureAirport,
                                troubled: r.troubled,
                            })),
                        },
                        // assignmentAgreement: {
                        //     create: {
                        //         envelopeId:
                        //             claim.details.assignmentAgreement
                        //                 .envelopeId,
                        //         documentUrl:
                        //             claim.details.assignmentAgreement
                        //                 .documentUrl,
                        //         certificateUrl:
                        //             claim.details.assignmentAgreement
                        //                 .certificateUrl,
                        //         storagePath:
                        //             claim.details.assignmentAgreement
                        //                 .storagePath,
                        //     },
                        // },
                    },
                },
                state: {
                    create: {
                        status: claim.state.status,
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
                        reason: claim.issue.reason,
                        delay: claim.issue.delay,
                        cancellationNoticeDays:
                            claim.issue.cancellationNoticeDays,
                        disruptionType: claim.issue.disruptionType,
                        airlineReason: claim.issue.airlineReason,
                        wasAlternativeFlightOffered:
                            claim.issue.wasAlternativeFlightOffered,
                        arrivalTimeDelayOfAlternativeHours:
                            claim.issue.arrivalTimeDelayOfAlternativeHours,
                        additionalInfo: claim.issue.additionalInfo,
                    },
                },
                payment: {
                    create: {
                        email: claim.payment.email,
                        termsAgreed: claim.payment.termsAgreed,
                        paymentMethod: claim.payment.paymentMethod,
                        bankName: claim.payment.bankName,
                        accountName: claim.payment.accountName,
                        accountNumber: claim.payment.accountNumber,
                        routingNumber: claim.payment.routingNumber,
                        iban: claim.payment.iban,
                        paypalEmail: claim.payment.paypalEmail,
                    },
                },
            },
            include: {
                details: {
                    include: {
                        assignmentAgreement: true,
                        routes: true,
                    },
                },
                state: {
                    include: {
                        progress: true,
                    },
                },
                customer: true,
                issue: true,
                payment: true,
                documents: true,
            },
        });
    }

    async updateClaim(newClaim: UpdateClaimDto, claimId: string) {
        return this.prisma.claim.update({
            data: {
                details: {
                    create: {
                        flightNumber: newClaim.details.flightNumber,
                        date: newClaim.details.date,
                        airline: newClaim.details.airline,
                        bookingRef: newClaim.details.bookingRef,
                        routes: {
                            create: newClaim.details.routes.map((r) => ({
                                arrivalAirport: r.arrivalAirport,
                                departureAirport: r.departureAirport,
                                troubled: r.troubled,
                            })),
                        },
                    },
                },
                state: {
                    create: {
                        status: newClaim.state.status,
                        amount: newClaim.state.amount,
                    },
                },
                customer: {
                    create: {
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
                    create: {
                        reason: newClaim.issue.reason,
                        delay: newClaim.issue.delay,
                        cancellationNoticeDays:
                            newClaim.issue.cancellationNoticeDays,
                        disruptionType: newClaim.issue.disruptionType,
                        airlineReason: newClaim.issue.airlineReason,
                        wasAlternativeFlightOffered:
                            newClaim.issue.wasAlternativeFlightOffered,
                        arrivalTimeDelayOfAlternativeHours:
                            newClaim.issue.arrivalTimeDelayOfAlternativeHours,
                        additionalInfo: newClaim.issue.additionalInfo,
                    },
                },
                payment: {
                    create: {
                        email: newClaim.payment.email,
                        termsAgreed: newClaim.payment.termsAgreed,
                        paymentMethod: newClaim.payment.paymentMethod,
                        bankName: newClaim.payment.bankName,
                        accountName: newClaim.payment.accountName,
                        accountNumber: newClaim.payment.accountNumber,
                        routingNumber: newClaim.payment.routingNumber,
                        iban: newClaim.payment.iban,
                        paypalEmail: newClaim.payment.paypalEmail,
                    },
                },
            },
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
    getUserClaims(userId?: string): Promise<Claim[]> {
        return this.prisma.claim.findMany({
            where: {
                userId,
            },
        });
    }
}
