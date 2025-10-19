import { IsJWT, IsNumber, IsOptional, IsString } from 'class-validator';

export class UploadDocumentsJwtQueryDto {
    @IsJWT()
    jwt: string;

    @IsString()
    claimId: string;

    @IsOptional()
    @IsNumber()
    step?: number;

    @IsString()
    passengerId: string;
}
