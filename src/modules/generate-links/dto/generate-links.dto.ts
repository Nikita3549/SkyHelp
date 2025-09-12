import { IsJWT, IsString } from 'class-validator';

export class CustomerClaimDto {
    @IsString()
    customerId: string;

    @IsString()
    claimId: string;
}

export class OtherPassengerClaimDto {
    @IsString()
    passengerId: string;

    @IsString()
    claimId: string;
}

export class PublicSignOtherPassengerDto {
    @IsString()
    passengerId: string;

    @IsJWT()
    claimJwt: string;
}

export class PublicUploadPassportDto {
    @IsString()
    customerId: string;

    @IsJWT()
    claimJwt: string;
}
