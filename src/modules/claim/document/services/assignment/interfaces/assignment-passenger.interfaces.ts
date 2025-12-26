import { ClaimCustomer, OtherPassenger } from '@prisma/client';

export type IAssignmentPassenger =
    | (ClaimCustomer & { isMinor: false })
    | OtherPassenger;
