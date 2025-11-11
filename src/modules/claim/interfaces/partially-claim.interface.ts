import {
    Airline,
    ArrivalAirport,
    Claim,
    ClaimDetails,
    ClaimState,
    DepartureAirport,
    Document,
    DuplicatedClaim,
    OtherPassenger,
    Progress,
    Route,
} from '@prisma/client';

export interface IPartiallyClaim extends Claim {
    details: IPartiallyClaimDetails;
    state: IPartiallyClaimState;
    customer: IPartiallyClaimCustomer;
    passengers: IPartiallyClaimPassenger[];
    duplicates: DuplicatedClaim[];
    documents: IPartiallyClaimDocument[];
}

interface IPartiallyClaimDetails extends Omit<ClaimDetails, 'id' | 'airline'> {
    airlines: Airline;
    routes: IPartiallyClaimRoute[];
}

interface IPartiallyClaimRoute extends Route {
    ArrivalAirport: ArrivalAirport;
    DepartureAirport: DepartureAirport;
}

interface IPartiallyClaimState
    extends Pick<
        ClaimState,
        'id' | 'status' | 'amount' | 'updatedAt' | 'comments'
    > {
    progress: Progress[];
}

interface IPartiallyClaimCustomer {
    firstName: string;
    lastName: string;
    email: string;
}

interface IPartiallyClaimPassenger
    extends Pick<OtherPassenger, 'id' | 'isMinor'> {}

interface IPartiallyClaimDocument extends Omit<Document, 'path'> {}
