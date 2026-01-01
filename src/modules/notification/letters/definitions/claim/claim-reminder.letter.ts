import { IBaseLetterData } from '../../base-letter-data.interface';
import { ReminderTypeEnum } from '../../../enums/reminder-type.enum';
import { BaseLetter } from '../../base-letter';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IClaimReminderLetterData extends IBaseLetterData {
    customerName: string;
    claimId: string;
    reminderType: ReminderTypeEnum;
}

export class ClaimReminderLetter extends BaseLetter<IClaimReminderLetterData> {
    get subject(): string {
        return `Current Progress on Your Claim #${this.data.claimId}`;
    }

    get templateFileName(): string {
        let templateFilename: string =
            LETTERS_FILENAMES.CLAIM.REMINDERS.CLAIM_RECEIVED;
        if (this.data.reminderType == ReminderTypeEnum.SENT_TO_AIRLINE) {
            templateFilename =
                LETTERS_FILENAMES.CLAIM.REMINDERS.SENT_TO_AIRLINE;
        }
        if (this.data.reminderType == ReminderTypeEnum.LEGAL_PROCESS) {
            templateFilename = LETTERS_FILENAMES.CLAIM.REMINDERS.LEGAL_PROCESS;
        }

        return templateFilename;
    }

    get context(): Record<string, string> {
        return { clientName: this.data.customerName };
    }

    get claimId(): string {
        return this.data.claimId;
    }
}
