import { IsEnum, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { Languages } from '../../language/enums/languages.enums';

export class LanguageWithReferrerDto {
    @IsOptional()
    @Transform(({ value }) =>
        Object.values(Languages).includes(value) ? value : undefined,
    )
    @IsEnum(Languages)
    language?: Languages;

    @IsOptional()
    @IsString()
    referrer?: string;
}
