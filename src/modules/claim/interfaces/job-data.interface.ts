import { Languages } from '../../language/enums/languages.enums';

export interface IJobData {
    email: string;
    claimId: string;
    clientFirstName: string;
    compensation: number;
    continueClaimLink: string;
    language?: Languages;
}
