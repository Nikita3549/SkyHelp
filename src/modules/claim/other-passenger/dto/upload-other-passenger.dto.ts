import { IsEnum, IsJWT, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';
import { Transform } from 'class-transformer';

export class UploadOtherPassengerDto {
    @IsString()
    claimId: string;

    @Transform(({ value }) => {
        try {
            return JSON.parse(value);
        } catch {
            return Array.isArray(value) ? value : [value];
        }
    })
    @IsEnum(DocumentType, { each: true })
    documentTypes: DocumentType[];
    @IsJWT()
    jwt: string;

    @IsString()
    passengerId: string;
}
