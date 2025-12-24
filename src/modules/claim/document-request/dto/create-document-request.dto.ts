import { IsEnum, IsOptional, IsString } from 'class-validator';
import { DocumentRequestReason, DocumentRequestType } from '@prisma/client';

export class CreateDocumentRequestDto {
    @IsEnum(DocumentRequestType)
    type: DocumentRequestType;

    @IsString()
    passengerId: string;

    @IsString()
    claimId: string;

    @IsEnum(DocumentRequestReason)
    @IsOptional()
    reason: DocumentRequestReason = DocumentRequestReason.MISSING_DOCUMENT;
}
