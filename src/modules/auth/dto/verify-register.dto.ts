import { IsNumber, IsString } from 'class-validator';

export class VerifyRegisterDto {
    @IsString()
    email: string;

    @IsNumber()
    code: number;
}
