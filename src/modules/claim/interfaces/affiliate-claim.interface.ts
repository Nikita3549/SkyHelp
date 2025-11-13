import {
    Airline,
    Claim,
    ClaimDetails,
    ClaimState,
    DuplicatedClaim,
    OtherPassenger,
} from '@prisma/client';

export interface IAffiliateClaim extends Claim {
    details: IAffiliateClaimDetails;
    state: IAffiliateClaimState;
    customer: IAffiliateClaimCustomer;
    passengers: IAffiliateClaimPassenger[];
    duplicates: DuplicatedClaim[];
}

interface IAffiliateClaimDetails extends ClaimDetails {
    airlines: Airline;
}

interface IAffiliateClaimState
    extends Pick<ClaimState, 'id' | 'status' | 'amount' | 'updatedAt'> {}

interface IAffiliateClaimCustomer {
    firstName: string;
    lastName: string;
    email: string;
}

interface IAffiliateClaimPassenger
    extends Pick<OtherPassenger, 'id' | 'isMinor'> {}
