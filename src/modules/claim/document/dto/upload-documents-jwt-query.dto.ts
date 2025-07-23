import { IsJWT, IsNumber, IsString } from 'class-validator';

export class UploadDocumentsJwtQueryDto {
    @IsJWT()
    jwt: string;

    @IsString()
    claimId: string;

    @IsNumber()
    step: number;
}
