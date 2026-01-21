import {
    ArrayNotEmpty,
    IsArray,
    IsBoolean,
    IsOptional,
    IsString,
} from 'class-validator';

export class MergeDocumentsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    documentIds: string[];

    @IsOptional()
    @IsBoolean()
    withPrecourtDocument?: boolean | null;
}
