import { Languages } from '../../../language/enums/languages.enums';

export interface IPaymentDetailsRequestJobData {
    customerEmail: string;
    customerName: string;
    customerLanguage: Languages;
    claimId: string;
}
