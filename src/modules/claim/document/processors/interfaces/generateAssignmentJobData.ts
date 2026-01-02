import { BasePassenger } from '../../../../claim-persistence/interfaces/base-passenger.interface';
import { ISaveSignatureOptions } from '../../services/assignment/interfaces/save-signature-options.interface';
import { IAssignmentSignature } from '../../services/assignment/interfaces/assignment-signature.interface';
import { IFullClaim } from '../../../../claim-persistence/types/claim-persistence.types';

export interface IGenerateAssignmentJobData {
    claim: IFullClaim;
    passenger: BasePassenger;
    options?: ISaveSignatureOptions;
    signature: IAssignmentSignature;
}
