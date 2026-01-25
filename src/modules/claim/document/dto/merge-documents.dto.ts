import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';

export class MergeDocumentsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    documentIds: string[];

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    withPrecourtDocument?: boolean | null;
}
