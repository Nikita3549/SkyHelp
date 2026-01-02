import { BasePassenger } from '../../../claim-persistence/interfaces/base-passenger.interface';
import { IFullClaim } from '../../../claim-persistence/types/claim-persistence.types';

export interface ISaveSignatureData {
    passenger: BasePassenger;
    claim: IFullClaim;
}
