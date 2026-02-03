import { IsEnum, IsOptional } from 'class-validator';
import { Languages } from '../../../language/enums/languages.enums';

export class GenerateAiSummaryDto {
    @IsOptional()
    @IsEnum(Languages)
    languages: Languages = Languages.EN;
}
