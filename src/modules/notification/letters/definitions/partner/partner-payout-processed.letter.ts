import { IBaseLetterData } from '../../base-letter-data.interface';
import { BaseLetter } from '../../base-letter';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IPartnerPayoutProcessedLetterData extends IBaseLetterData {
    amount: number;
}

export class PartnerPayoutProcessedLetter extends BaseLetter<IPartnerPayoutProcessedLetterData> {
    get subject(): string {
        return 'Your Payout Has Been Processed';
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.PARTNER.PAYOUT_PROCESSED;
    }

    get context(): Record<string, number> {
        return {
            amount: this.data.amount,
        };
    }
}
