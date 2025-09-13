import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentRequestQuery {
    @IsString()
    claimId: string;

    @IsOptional()
    @IsEnum(DocumentType)
    documentType: DocumentType;
}
