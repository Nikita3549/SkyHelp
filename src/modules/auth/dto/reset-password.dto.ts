import { IsNumber, IsString, MaxLength, MinLength } from 'class-validator';

export class ResetPasswordDto {
    @IsString()
    email: string;

    @IsNumber()
    code: number;

    @IsString()
    @MaxLength(128)
    @MinLength(10)
    newPassword: string;
}
