import { IsNumber, IsString } from 'class-validator';

export class VerifyResetPasswordDto {
    @IsString()
    email: string;

    @IsNumber()
    code: number;
}
