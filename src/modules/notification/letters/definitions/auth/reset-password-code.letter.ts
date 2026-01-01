import { IBaseLetterData } from '../../base-letter-data.interface';
import { BaseLetter } from '../../base-letter';
import { isProd } from '../../../../../common/utils/isProd';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IResetPasswordCodeLetterData extends IBaseLetterData {
    customerName: string;
    resetCode: number;
}

export class ResetPasswordCodeLetter extends BaseLetter<IResetPasswordCodeLetterData> {
    constructor(data: IResetPasswordCodeLetterData) {
        super(data);

        !isProd() &&
            console.log(
                `Seng forgot password code ${this.data.resetCode} on ${this.data.to}`,
            );
    }

    get subject(): string {
        return 'Verification code for your account';
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.AUTH.RESET_PASSWORD_CODE;
    }

    get context(): Record<string, string | number> {
        return {
            customerName: this.data.customerName,
            resetCode: this.data.resetCode,
        };
    }

    get saveInDb(): false {
        return false;
    }
}
