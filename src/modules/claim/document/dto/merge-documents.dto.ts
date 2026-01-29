import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsEnum,
    IsOptional,
    IsString,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { MergeDocumentsExtensions } from '../constants/merge-documents-extensions.enum';

export class MergeDocumentsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    documentIds: string[];

    @IsOptional()
    @Transform(({ value }) => value === 'true' || value === true)
    @IsBoolean()
    withPrecourtDocument?: boolean | null;

    @IsOptional()
    @IsEnum(MergeDocumentsExtensions)
    extension: MergeDocumentsExtensions = MergeDocumentsExtensions.pdf;
}
