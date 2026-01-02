import { IFullClaim } from '../../../interfaces/full-claim.interface';
import { BasePassenger } from '../../../../claim-persistence/interfaces/base-passenger.interface';
import { ISaveSignatureOptions } from '../../services/assignment/interfaces/save-signature-options.interface';
import { IAssignmentSignature } from '../../services/assignment/interfaces/assignment-signature.interface';

export interface IGenerateAssignmentJobData {
    claim: IFullClaim;
    passenger: BasePassenger;
    options?: ISaveSignatureOptions;
    signature: IAssignmentSignature;
}
