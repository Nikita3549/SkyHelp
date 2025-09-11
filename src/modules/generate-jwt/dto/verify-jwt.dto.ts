import { IsJWT } from 'class-validator';

export class VerifyJwtDto {
    @IsJWT()
    jwt: string;
}
