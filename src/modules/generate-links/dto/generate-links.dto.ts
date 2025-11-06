import { IsEnum, IsJWT, IsString } from 'class-validator';

export class UploadDocumentsDto {
    @IsString()
    passengerId: string;

    @IsString()
    claimId: string;
}

export class SignCustomerDto {
    @IsString()
    customerId: string;

    @IsString()
    claimId: string;
}

export class PublicSignOtherPassengerDto {
    @IsString()
    passengerId: string;

    @IsJWT()
    claimJwt: string;
}

export class PublicUploadDocumentsDto {
    @IsString()
    passengerId: string;

    @IsJWT()
    claimJwt: string;

    @IsString()
    documentTypes: string;
}
