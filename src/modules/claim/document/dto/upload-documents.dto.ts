import { IsArray, IsEnum } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentsDto {
    @IsArray()
    @IsEnum(DocumentType, { each: true })
    documentTypes: DocumentType[];
}
