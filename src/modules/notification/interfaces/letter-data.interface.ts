import { EmailCategory } from '../../gmail/enums/email-type.enum';
import { Languages } from '../../language/enums/languages.enums';

export interface ILetterData {
    to: string;
    subject: string;
    language: Languages;
    claimId?: string;
    emailCategory: EmailCategory;
    templateFilename: string;
    context: Record<string, string | number>;
}
