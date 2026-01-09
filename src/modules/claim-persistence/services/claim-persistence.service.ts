import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Claim, ClaimStatus, DocumentType, Prisma } from '@prisma/client';
import { BasePassenger } from '../interfaces/base-passenger.interface';
import { ViewClaimType } from '../enums/view-claim-type.enum';
import { ClaimIncludeProvider } from '../providers/claim-include.provider';
import { IFullClaim } from '../types/claim-persistence.types';
import { defaultProgress } from '../../claim/progress/constants/progresses/default-progress';
import { normalizePhone } from '../../../common/utils/normalizePhone';
import { CreateClaimDto } from '../../claim/dto/create-claim.dto';
import { ISaveClaimInternalData } from '../interfaces/save-claim-internal-data.interface';
import { UpdateClaimDto } from '../../claim/dto/update-claim.dto';

@Injectable()
export class ClaimPersistenceService implements OnModuleInit {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimIncludeProvider: ClaimIncludeProvider,
    ) {}

    // Migrate field signedAt
    async onModuleInit() {
        const claims = await this.prisma.claim.findMany({
            include: this.claimIncludeProvider.getInclude(),
            where: {
                documents: {
                    some: {
                        type: DocumentType.ASSIGNMENT,
                    },
                },
            },
        });

        for (let i = 0; i < claims.length; i++) {
            const claim = claims[i];

            const passengerIds = [
                claim.customer.id,
                ...claim.passengers.map((p) => p.id),
            ];

            for (const passengerId of passengerIds) {
                let latestSignedAt: Date | null = null;

                const assignmentDocuments = claim.documents.filter(
                    (d) =>
                        d.passengerId === passengerId &&
                        d.type === DocumentType.ASSIGNMENT,
                );

                for (const document of assignmentDocuments) {
                    const signedAt = this.extractDateFromFileName(
                        document.name,
                        claim.id,
                    );

                    if (
                        signedAt &&
                        (!latestSignedAt || signedAt > latestSignedAt)
                    ) {
                        latestSignedAt = signedAt;
                    }
                }

                if (latestSignedAt) {
                    await this.updatePassenger(passengerId, {
                        signedAt: latestSignedAt,
                    });
                }
            }
        }
    }

    private async updatePassenger(
        passengerId: string,
        data: { signedAt: Date },
    ) {
        await this.prisma.claimCustomer.updateMany({
            where: {
                id: passengerId,
            },
            data: {
                signedAt: data.signedAt,
            },
        });

        await this.prisma.otherPassenger.updateMany({
            where: {
                id: passengerId,
            },
            data: {
                signedAt: data.signedAt,
            },
        });
    }

    private extractDateFromFileName(fileName: string, claimId: string): Date {
        const dateRegex = /(\d{2})\.(\d{2})\.(\d{4})/;
        const match = fileName.match(dateRegex);

        if (!match) {
            throw new Error(
                `Cant find date at filename, filename: ${fileName}, claim: ${claimId}`,
            );
        }

        const [_, day, month, year] = match;

        const date = new Date(Number(year), Number(month) - 1, Number(day));

        if (isNaN(date.getTime())) {
            throw new Error(
                `Incorrect data format filename: ${fileName}, claim: ${claimId}`,
            );
        }

        return date;
    }

    async findOneById(
        claimId: string,
        options?: { documentsWithPath: boolean },
    ): Promise<IFullClaim | null> {
        return this.prisma.claim.findFirst({
            where: {
                id: claimId,
            },
            include: this.claimIncludeProvider.getInclude(
                ViewClaimType.FULL,
                options,
            ),
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

    async updateMany(data: Partial<Claim>, claimIds: string[]) {
        return this.prisma.claim.updateMany({
            where: {
                id: {
                    in: claimIds,
                },
            },
            data,
        });
    }

    async update(
        data: Partial<Claim>,
        claimId: string,
    ): Promise<IFullClaim | null> {
        return this.prisma.claim.update({
            data,
            where: {
                id: claimId,
            },
            include: this.claimIncludeProvider.getInclude(),
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
            include: this.claimIncludeProvider.getInclude(),
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
            include: this.claimIncludeProvider.getInclude(),
        });
    }

    async findDuplicate(data: {
        firstName: string;
        lastName: string;
        email: string;
        flightNumber: string;
    }) {
        return this.prisma.claim.findMany({
            where: {
                customer: {
                    firstName: data.firstName,
                    lastName: data.lastName,
                    email: data.email,
                },
                details: {
                    flightNumber: data.flightNumber,
                },
            },
        });
    }

    async save(
        claimData: CreateClaimDto,
        extraData: ISaveClaimInternalData,
    ): Promise<IFullClaim> {
        const {
            language,
            userId,
            flightNumber,
            referrer,
            referrerSource,
            fullRoutes,
            referredById,
            numericId,
            continueClaimLink,
            duplicatedClaims,
        } = extraData;

        return this.prisma.claim.create({
            data: {
                id: numericId,
                ...(userId ? { user: { connect: { id: userId } } } : {}),
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
                        phone: normalizePhone(claimData.customer.phone) || '-',
                        address: claimData.customer.address,
                        city: claimData.customer.city,
                        state: claimData.customer.state,
                        whatsapp: claimData.customer.whatsapp,
                        country: claimData.customer.country,
                        language,
                        compensation: claimData.state.amount,
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
                            claimData.issue.wasAlternativeFlightOffered ||
                            undefined,
                        arrivalTimeDelayOfAlternativeHours:
                            claimData.issue.arrivalTimeDelayOfAlternativeHours,
                        additionalInfo: claimData.issue.additionalInfo,
                        hasContactedAirline:
                            claimData.issue.hasContactedAirline,
                        baggageDelayCategory:
                            claimData.issue.baggageDelayCategory,
                    },
                },
                payment: { create: {} },
            },
            include: this.claimIncludeProvider.getInclude(),
        });
    }

    async updateFullObject(
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
                              idnp: newClaim.payment.idnp,
                              bic: newClaim.payment.bic,
                              region: newClaim.payment.region,
                          }
                        : undefined,
                },
            },
            include: this.claimIncludeProvider.getInclude(),
            where: {
                id: claimId,
            },
        });
    }
}
