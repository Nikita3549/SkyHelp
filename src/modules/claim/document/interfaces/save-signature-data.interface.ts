import { BasePassenger } from '../../interfaces/base-passenger.interface';
import { IFullClaim } from '../../interfaces/full-claim.interface';

export interface ISaveSignatureData {
    passenger: BasePassenger;
    claim: IFullClaim;
}
