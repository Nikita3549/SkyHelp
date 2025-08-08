import { IsEnum, IsJWT, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadOtherPassengerDto {
    @IsString()
    claimId: string;

    @IsEnum(DocumentType)
    documentType: DocumentType;

    @IsJWT()
    jwt: string;
}
