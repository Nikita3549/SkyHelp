import {
    Airline,
    ArrivalAirport,
    Claim,
    ClaimDetails,
    ClaimState,
    ClaimCustomer,
    DepartureAirport,
    Document,
    DuplicatedClaim,
    OtherPassenger,
    ClaimPayment,
    Progress,
    Route,
} from '@prisma/client';

export interface IAccountantClaim extends Claim {
    details: IAccountantClaimDetails;
    state: IAccountantClaimState;
    customer: ClaimCustomer;
    documents: IAccountantClaimDocument[];
    passengers: IAccountantClaimPassenger[];
    duplicates: DuplicatedClaim[];
    payment: ClaimPayment;
}

interface IAccountantClaimDetails extends Omit<ClaimDetails, 'id' | 'airline'> {
    airlines: Airline;
    routes: IAccountantClaimRoute[];
}

interface IAccountantClaimRoute extends Route {
    ArrivalAirport: ArrivalAirport;
    DepartureAirport: DepartureAirport;
}

interface IAccountantClaimState
    extends Pick<
        ClaimState,
        'id' | 'status' | 'amount' | 'updatedAt' | 'comments'
    > {
    progress: Progress[];
}

interface IAccountantClaimPassenger
    extends Pick<OtherPassenger, 'id' | 'isMinor'> {}

interface IAccountantClaimDocument extends Omit<Document, 'path'> {}
