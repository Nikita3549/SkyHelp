import { IsOptional, IsString } from 'class-validator';

export class SendContactUsDataDto {
    @IsString()
    email: string;

    @IsString()
    message: string;

    @IsString()
    name: string;

    @IsString()
    phone: string;

    @IsString()
    subject: string;

    @IsOptional()
    @IsString()
    claimId?: string;
}
