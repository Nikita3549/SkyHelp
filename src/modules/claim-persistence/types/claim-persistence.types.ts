import { Prisma } from '@prisma/client';
import { ClaimIncludeProvider } from '../providers/claim-include.provider';

export type FullInclude = ReturnType<ClaimIncludeProvider['fullClaimInclude']>;
export type AffiliateInclude = ReturnType<
    ClaimIncludeProvider['affiliateClaimInclude']
>;
export type AccountantInclude = ReturnType<
    ClaimIncludeProvider['accountantClaimInclude']
>;

export type IFullClaim = Prisma.ClaimGetPayload<{ include: FullInclude }>;
export type IAffiliateClaim = Prisma.ClaimGetPayload<{
    include: AffiliateInclude;
}>;
export type IAccountantClaim = Prisma.ClaimGetPayload<{
    include: AccountantInclude;
}>;
