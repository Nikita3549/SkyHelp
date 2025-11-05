import { IsEnum, IsJWT, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class UploadOtherPassengerDto {
    @IsString()
    claimId: string;

    @IsEnum(DocumentType, { each: true })
    documentTypes: DocumentType[];

    @IsJWT()
    jwt: string;

    @IsString()
    passengerId: string;
}
