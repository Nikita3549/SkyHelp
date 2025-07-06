import {
    Airline,
    ArrivalAirport,
    Claim,
    ClaimCustomer,
    ClaimDetails,
    ClaimIssue,
    ClaimPayment,
    ClaimState,
    DepartureAirport,
    Document,
    Progress,
    Route,
} from '@prisma/client';

export interface IFullClaim extends Claim {
    customer: ClaimCustomer;
    issue: ClaimIssue;
    details: IClaimDetails;
    state: IClaimState;
    payment: ClaimPayment | null;
    documents: Document[];
}

interface IClaimDetails extends ClaimDetails {
    airlines: Airline;
    routes: IClaimRoute[];
}

interface IClaimRoute extends Route {
    ArrivalAirport: ArrivalAirport;
    DepartureAirport: DepartureAirport;
}

interface IClaimState extends ClaimState {
    progress: Progress[];
}
