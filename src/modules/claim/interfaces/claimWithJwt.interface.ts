import { Claim } from '@prisma/client';

export interface IClaimWithJwt {
    claimData: Claim;
    jwt: string;
    userToken: string | null;
}
