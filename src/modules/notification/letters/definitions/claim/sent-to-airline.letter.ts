import { BaseLetter } from '../../base-letter';
import { IBaseLetterData } from '../../base-letter-data.interface';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface ISendToAirlineLetterData extends IBaseLetterData {
    claimId: string;
    dashboardLink: string;
    clientName: string;
}

export class SendToAirlineLetter extends BaseLetter<ISendToAirlineLetterData> {
    get subject(): string {
        return `We've contacted the airline regarding your claim #${this.data.claimId}`;
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.CLAIM.SENT_TO_AIRLINE;
    }

    get context(): Record<string, string> {
        return {
            claimId: this.data.claimId,
            clientName: this.data.clientName,
            dashboardLink: this.data.dashboardLink,
        };
    }

    get claimId() {
        return this.data.claimId;
    }
}
