import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    Claim,
    ClaimCustomer,
    ClaimStatus,
    OtherPassenger,
    Prisma,
} from '@prisma/client';
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
export class ClaimPersistenceService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimIncludeProvider: ClaimIncludeProvider,
    ) {}

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
        data: {
            newStatus: ClaimStatus;
            claimId: string;
            passengerId: string;
        },
        tx?: Prisma.TransactionClient,
    ) {
        const client = tx ?? this.prisma;

        const basePassenger = await this.getBasePassenger(data.passengerId);

        if (!basePassenger) {
            return;
        }

        if (basePassenger.isCustomer) {
            client.claim.update({
                data: {
                    state: {
                        update: {
                            status: data.newStatus,
                        },
                    },
                },
                where: {
                    id: data.claimId,
                },
            });
            return;
        }

        return client.otherPassenger.update({
            where: {
                id: data.passengerId,
            },
            data: {
                claimStatus: data.newStatus,
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
                        createdViaBoardingPass:
                            claimData.state.createdViaBoardingPass,
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
                              bankAddress: newClaim.payment.bankAddress,
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
