import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod } from '@prisma/client';

export class PaymentDto {
    @IsEnum(PaymentMethod)
    paymentMethod: PaymentMethod;

    @IsOptional()
    @IsString()
    accountName?: string;

    @IsOptional()
    @IsString()
    email?: string;

    @IsOptional()
    @IsString()
    iban?: string;

    @IsOptional()
    @IsString()
    paypalEmail?: string;

    @IsOptional()
    @IsString()
    accountNumber?: string;

    @IsOptional()
    @IsString()
    bankName?: string;
}
