import { IsEnum, IsJWT, IsNumber, IsOptional, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadDocumentsJwtQueryDto {
    @IsJWT()
    jwt: string;

    @IsString()
    claimId: string;

    @IsNumber()
    step: number;

    @IsOptional()
    @IsEnum(DocumentType)
    documentType: DocumentType;

    @IsString()
    passengerId: string;
}
