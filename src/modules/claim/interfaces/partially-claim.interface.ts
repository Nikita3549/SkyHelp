import {
    Airline,
    Claim,
    ClaimDetails,
    ClaimState,
    OtherPassenger,
    DuplicatedClaim,
} from '@prisma/client';

export interface IPartiallyClaim extends Claim {
    details: IPartiallyClaimDetails;
    state: IPartiallyClaimState;
    customer: IPartiallyClaimCustomer;
    passengers: IPartiallyClaimPassenger[];
    duplicates: DuplicatedClaim[];
}

interface IPartiallyClaimDetails extends Omit<ClaimDetails, 'id' | 'airline'> {
    airlines: Airline;
}

interface IPartiallyClaimState extends Pick<ClaimState, 'status' | 'amount'> {}

interface IPartiallyClaimCustomer {
    firstName: string;
    lastName: string;
    email: string;
}

interface IPartiallyClaimPassenger
    extends Pick<OtherPassenger, 'id' | 'isMinor'> {}
