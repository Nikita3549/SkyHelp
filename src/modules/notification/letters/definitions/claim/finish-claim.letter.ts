import { IBaseLetterData } from '../../base-letter-data.interface';
import { BaseLetter } from '../../base-letter';
import { EmailCategory } from '../../../../gmail/enums/email-type.enum';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IFinishClaimLetterData extends IBaseLetterData {
    claimId: string;
    clientFirstName: string;
    compensation: number;
    continueClaimLink: string;
}

export class FinishClaimLetter extends BaseLetter<IFinishClaimLetterData> {
    get subject(): string {
        return `Just one step away from your compensation #${this.data.claimId}`;
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.CLAIM.FINISH_CLAIM;
    }

    get context(): Record<string, string | number> {
        return {
            clientName: this.data.clientFirstName,
            compensation: this.data.compensation,
            claimId: this.data.claimId,
            claimLink: this.data.continueClaimLink,
        };
    }

    get claimId(): string {
        return this.data.claimId;
    }

    get emailCategory(): EmailCategory.MARKETING {
        return EmailCategory.MARKETING;
    }
}
