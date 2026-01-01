import { IBaseLetterData } from '../../base-letter-data.interface';
import { BaseLetter } from '../../base-letter';
import { isProd } from '../../../../../common/utils/isProd';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IRegisterCodeLetterData extends IBaseLetterData {
    customerName: string;
    registerCode: number;
}

export class RegisterCodeLetter extends BaseLetter<IRegisterCodeLetterData> {
    constructor(data: IRegisterCodeLetterData) {
        super(data);

        !isProd() &&
            console.log(
                `Seng register code ${this.data.registerCode} on ${this.data.to}`,
            );
    }

    get subject(): string {
        return 'Verification code for your account';
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.AUTH.REGISTER_CODE;
    }

    get context(): Record<string, string | number> {
        return {
            customerName: this.data.customerName,
            verificationCode: this.data.registerCode,
        };
    }

    get saveInDb(): false {
        return false;
    }
}
