import { Claim } from '@prisma/client';
import { ICreateClaimExtraData } from '../../claim/interfaces/create-claim-extra-data.interface';

export interface ISaveClaimInternalData extends ICreateClaimExtraData {
    numericId: string;
    continueClaimLink: string;
    duplicatedClaims: Claim[];
}
