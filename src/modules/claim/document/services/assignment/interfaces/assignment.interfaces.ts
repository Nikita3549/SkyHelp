import { ClaimCustomer, OtherPassenger } from '@prisma/client';

export interface IAssignmentData {
    claimId: string;
    address: string;
    airlineName: string;
    date: Date;
    firstName: string;
    lastName: string;
    flightNumber: string;
}

export interface IParentalAssignmentData extends IAssignmentData {
    minorBirthday: Date;
    parentFirstName: string;
    parentLastName: string;
}

export interface ISignatureRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
    page?: number;
}

export type IAssignmentPassenger =
    | (ClaimCustomer & { isMinor: false })
    | OtherPassenger;
