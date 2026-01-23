import { IsEnum, IsOptional, IsString } from 'class-validator';
import { PaymentMethod, PaymentRegion } from '@prisma/client';

export class UpdatePaymentDto {
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

    @IsOptional()
    @IsString()
    idnp?: string;

    @IsOptional()
    @IsString()
    bic?: string;

    @IsOptional()
    @IsEnum(PaymentRegion)
    region?: PaymentRegion;

    @IsOptional()
    @IsString()
    bankAddress?: string;
}
