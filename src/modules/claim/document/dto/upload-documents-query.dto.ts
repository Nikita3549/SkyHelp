import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentsQueryDto {
    @IsString()
    claimId: string;

    @IsOptional()
    @IsEnum(DocumentType)
    documentType: DocumentType;
}
