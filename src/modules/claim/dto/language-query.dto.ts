import { Languages } from '../../language/enums/languages.enums';
import { IsEnum, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class LanguageQueryDto {
    @IsOptional()
    @Transform(({ value }) =>
        Object.values(Languages).includes(value) ? value : undefined,
    )
    @IsEnum(Languages)
    language?: Languages;
}
