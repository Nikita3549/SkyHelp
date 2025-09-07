import { IsEnum, IsString } from 'class-validator';
import { DocumentRequestType, DocumentType } from '@prisma/client';

export class CreateDocumentRequestDto {
    @IsEnum(DocumentRequestType)
    type: DocumentRequestType;

    @IsString()
    passenger: string;

    @IsString()
    claimId: string;

    @IsEnum(DocumentType)
    documentType: DocumentType;
}
