import { Injectable } from '@nestjs/common';
import { ViewClaimType } from '../enums/view-claim-type.enum';
import { IGetIncludeConfig } from '../interfaces/get-include-config.interface';
import {
    AccountantInclude,
    AffiliateInclude,
    FullInclude,
} from '../types/claim-persistence.types';

@Injectable()
export class ClaimIncludeProvider {
    getInclude(viewType: ViewClaimType.AFFILIATE): AffiliateInclude;

    getInclude(viewType: ViewClaimType.ACCOUNTANT): AccountantInclude;

    getInclude(
        viewType?: ViewClaimType.FULL,
        config?: IGetIncludeConfig,
    ): FullInclude;

    getInclude(
        viewType: ViewClaimType,
        config?: IGetIncludeConfig,
    ): AffiliateInclude | AccountantInclude | FullInclude;

    getInclude(
        viewType: ViewClaimType = ViewClaimType.FULL,
        config?: IGetIncludeConfig,
    ) {
        switch (viewType) {
            case ViewClaimType.FULL:
                return this.fullClaimInclude(config);
            case ViewClaimType.AFFILIATE:
                return this.affiliateClaimInclude();
            case ViewClaimType.ACCOUNTANT:
                return this.accountantClaimInclude();
        }
    }

    private fullClaimInclude(config?: IGetIncludeConfig) {
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
        } as const;
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
        } as const;
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
            documents: {
                omit: {
                    path: true,
                },
            },
            passengers: true,
            duplicates: true,
            payment: true,
        } as const;
    }
}
