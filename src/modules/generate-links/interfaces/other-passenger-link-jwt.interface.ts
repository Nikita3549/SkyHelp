import { OtherPassengerCopiedLinkType } from '@prisma/client';

export interface IOtherPassengerLinkJwt {
    otherPassengerId: string;
    claimId: string;
    otherPassengerCopiedLinkType: OtherPassengerCopiedLinkType;
}
