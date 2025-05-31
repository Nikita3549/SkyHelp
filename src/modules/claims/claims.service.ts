import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Claim, Document } from '@prisma/client';
import { CreateClaimDto } from './dto/create-claim.dto';

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
                        arrivalAirport: claim.details.arrivalAirport,
                        departureAirport: claim.details.departureAirport,
                        connectionAirports: claim.details.connectionAirports,
                        flightNumber: claim.details.flightNumber,
                        date: claim.details.date,
                        airline: claim.details.airline,
                        bookingRef: claim.details.bookingRef,
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
                        updatedAt: claim.state.updated_at,
                        progress: {
                            create: claim.state.progress.map((p) => ({
                                title: p.title,
                                description: p.description,
                                endAt: p.endAt,
                                status: p.status,
                            })),
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
}
