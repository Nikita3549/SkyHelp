import { IsEnum, IsString } from 'class-validator';
import { Languages } from '../../language/enums/languages.enums';

export class SuggestReplyDto {
    @IsEnum(Languages)
    targetLanguage: Languages;

    @IsString()
    claimId: string;
}
