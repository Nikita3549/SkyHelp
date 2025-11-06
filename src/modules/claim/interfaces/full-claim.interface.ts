import {
    Airline,
    ArrivalAirport,
    Claim,
    ClaimCustomer,
    ClaimDetails,
    ClaimIssue,
    ClaimPayment,
    ClaimRecentUpdates,
    ClaimState,
    DepartureAirport,
    Document,
    OtherPassenger,
    OtherPassengerCopiedLink,
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
    agent: IPartner | null;
    recentUpdates: ClaimRecentUpdates[];
    passengers: IClaimOtherPassenger[];
    duplicates: IDuplicate[];
}

export interface IFullClaimWithJwt extends IFullClaim {
    jwt: string;
}

export interface IClaimOtherPassenger extends OtherPassenger {
    copiedLinks: OtherPassengerCopiedLink[];
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

interface IPartner {
    email: string;
    name: string;
    secondName: string;
}

interface IDuplicate {
    id: string;
    claimId: string;
    duplicatedClaimId: string;
}
