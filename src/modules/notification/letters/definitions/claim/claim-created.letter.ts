import { BaseLetter } from '../../base-letter';
import { IBaseLetterData } from '../../base-letter-data.interface';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IClaimCreatedData extends IBaseLetterData {
    claimId: string;
    airlineName: string;
    dashboardLink: string;
}

export class ClaimCreatedLetter extends BaseLetter<IClaimCreatedData> {
    get subject(): string {
        return `Your claim successfully submitted #${this.data.claimId}`;
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.CLAIM.CREATE_CLAIM;
    }

    get context(): Record<string, string> {
        return {
            claimId: this.data.claimId,
            airlineName: this.data.airlineName,
            claimLink: this.data.dashboardLink,
        };
    }

    get claimId() {
        return this.data.claimId;
    }
}
