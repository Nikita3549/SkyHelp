import { ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class MergeDocumentsDto {
    @IsArray()
    @ArrayNotEmpty()
    @IsString({ each: true })
    documentIds: string[];
}
