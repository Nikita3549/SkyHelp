import { Languages } from '../../language/enums/languages.enums';
import { EmailCategory } from '../../gmail/enums/email-type.enum';
import { IBaseLetterData } from './base-letter-data.interface';

export abstract class BaseLetter<T extends IBaseLetterData> {
    constructor(protected readonly data: T) {}

    abstract get subject(): string;

    abstract get templateFileName(): string;

    abstract get context(): Record<string, unknown>;

    get to(): string {
        return this.data.to;
    }

    get language(): Languages {
        return this.data.language || Languages.EN;
    }

    // <-- OPTIONAL FIELDS -->
    get claimId(): string | undefined {
        return undefined;
    }

    get emailCategory(): EmailCategory {
        return EmailCategory.TRANSACTIONAL;
    }

    get saveInDb(): boolean {
        return true;
    }
}
