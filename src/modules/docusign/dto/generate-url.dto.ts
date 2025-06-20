import { IsJWT, IsString } from 'class-validator';

export class GenerateUrlDto {
    @IsString()
    claimId: string;

    @IsJWT()
    jwt: string;
}
