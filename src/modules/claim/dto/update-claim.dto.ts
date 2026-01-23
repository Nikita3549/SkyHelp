import {
    IsBoolean,
    IsEmail,
    IsEnum,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { PaymentMethod, PaymentRegion } from '@prisma/client';

class DetailsDto {
    @IsOptional()
    @IsString()
    bookingRef?: string;
}

class PaymentDto {
    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsBoolean()
    termsAgreed?: boolean;

    @IsOptional()
    @IsEnum(PaymentMethod)
    paymentMethod?: PaymentMethod;

    @IsOptional()
    @IsString()
    bankName?: string;

    @IsOptional()
    @IsString()
    accountName?: string;

    @IsOptional()
    @IsString()
    accountNumber?: string;

    @IsOptional()
    @IsString()
    iban?: string;

    @IsOptional()
    @IsEmail()
    paypalEmail?: string;

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

export class UpdateClaimDto {
    @ValidateNested()
    @Type(() => DetailsDto)
    details: DetailsDto;

    @ValidateNested()
    @Type(() => PaymentDto)
    payment: PaymentDto;
}
