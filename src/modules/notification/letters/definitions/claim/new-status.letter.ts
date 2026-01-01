import { IBaseLetterData } from '../../base-letter-data.interface';
import { BaseLetter } from '../../base-letter';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface INewStatusLetterData extends IBaseLetterData {
    title: string;
    description: string;
    clientName: string;
    claimId: string;
    comments: string | null;
    dashboardLink: string;
}

export class NewStatusLetter extends BaseLetter<INewStatusLetterData> {
    get subject(): string {
        return `Update on your claim #${this.data.claimId}`;
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.CLAIM.NEW_STATUS;
    }

    get context(): Record<string, string> {
        return {
            clientName: this.data.clientName,
            claimId: this.data.claimId,
            currentStepTitle: this.data.title,
            currentStepDescription: this.data.description,
            claimLink: this.data.dashboardLink,
            comments: this.data.comments ?? '',
        };
    }

    get claimId(): string {
        return this.data.claimId;
    }
}
