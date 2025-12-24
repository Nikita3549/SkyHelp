import { ClaimCustomer, OtherPassenger } from '@prisma/client';

export type BasePassenger = (
    | (ClaimCustomer & { claimId: string; isMinor: false })
    | OtherPassenger
) & {
    isCustomer: boolean;
};
