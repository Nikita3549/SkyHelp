import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
    @IsEmail()
    email: string;

    @IsString()
    @MaxLength(128)
    @MinLength(10)
    password: string;

    @IsString()
    name: string;

    @IsString()
    secondName: string;
}
