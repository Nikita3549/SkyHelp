import { IsJWT, IsString } from 'class-validator';

export class SaveClickDto {
    @IsJWT()
    jwt: string;

    @IsString()
    claimId: string;
}
