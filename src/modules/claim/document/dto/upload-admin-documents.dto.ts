import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadAdminDocumentsDto {
    @IsString()
    claimId: string;

    @IsString()
    passengerId: string;

    @IsOptional()
    @IsEnum(DocumentType)
    documentType: DocumentType;
}
