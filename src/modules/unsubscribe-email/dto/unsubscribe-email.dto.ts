import { IsEmail, IsJWT } from 'class-validator';

export class UnsubscribeEmailDto {
    @IsEmail()
    email: string;

    @IsJWT()
    jwt: string;
}
