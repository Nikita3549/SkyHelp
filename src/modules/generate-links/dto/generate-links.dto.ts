import { IsEnum, IsJWT, IsString } from 'class-validator';
import { DocumentType } from '@prisma/client';

export class OtherPassengerClaimDto {
    @IsString()
    passengerId: string;

    @IsString()
    claimId: string;

    @IsString()
    documentTypes: string;
}

export class PublicSignOtherPassengerDto {
    @IsString()
    passengerId: string;

    @IsJWT()
    claimJwt: string;
}

export class PublicUploadPassportDto {
    @IsString()
    passengerId: string;

    @IsJWT()
    claimJwt: string;

    @IsString()
    documentTypes: string;
}
