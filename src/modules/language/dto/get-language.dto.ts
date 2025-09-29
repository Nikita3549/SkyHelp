import { Languages } from '../enums/languages.enums';
import { IsEnum } from 'class-validator';

export class GetLanguageDto {
    @IsEnum(Languages)
    language: Languages;
}
