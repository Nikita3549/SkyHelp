import { IBaseLetterData } from '../../base-letter-data.interface';
import { BaseLetter } from '../../base-letter';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IMissingDocumentLetterData extends IBaseLetterData {
    customerName: string;
    dashboardLink: string;
    claimId: string;
}

export class MissingDocumentsLetter extends BaseLetter<IMissingDocumentLetterData> {
    get subject(): string {
        return `Missing documents for your claim #${this.data.claimId}`;
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.CLAIM.MISSING_DOCUMENTS;
    }

    get context(): Record<string, string> {
        return {
            customerName: this.data.customerName,
            dashboardLink: this.data.dashboardLink,
        };
    }

    get claimId(): string {
        return this.data.claimId;
    }
}
