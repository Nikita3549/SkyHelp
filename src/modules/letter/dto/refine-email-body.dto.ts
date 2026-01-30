import { IsEnum, IsString } from 'class-validator';
import { Languages } from '../../language/enums/languages.enums';

export class RefineEmailBodyDto {
    @IsString()
    body: string;

    @IsEnum(Languages)
    targetLanguage: Languages;
}
