import { DocumentType } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateDocumentTypeDto {
    @IsEnum(DocumentType)
    type: DocumentType;
}
