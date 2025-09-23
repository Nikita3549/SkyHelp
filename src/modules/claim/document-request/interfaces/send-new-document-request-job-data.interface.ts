import { Languages } from '../../../language/enums/languages.enums';

export interface SendNewDocumentRequestJobDataInterface {
    claimId: string;
    to: string;
    language: Languages;
    customerName: string;
}
