import { BaseLetter } from '../../base-letter';
import { IBaseLetterData } from '../../base-letter-data.interface';
import { isProd } from '../../../../../common/utils/isProd';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

export interface INewGeneratedAccountLetterData extends IBaseLetterData {
    email: string;
    password: string;
    resetPasswordLink: string;
}

export class NewGeneratedAccountLetter extends BaseLetter<INewGeneratedAccountLetterData> {
    constructor(data: INewGeneratedAccountLetterData) {
        super(data);

        !isProd() &&
            console.log(
                `User data send: ${data.email}, ${data.password} on ${data.to}`,
            );
    }

    get subject(): string {
        return 'Your SkyHelp account details';
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.AUTH.NEW_GENERATED_ACCOUNT;
    }

    get context(): Record<string, unknown> {
        return {
            email: this.data.email,
            password: this.data.password,
            resetPasswordLink: this.data.resetPasswordLink,
        };
    }

    get saveInDb(): false {
        return false;
    }
}
