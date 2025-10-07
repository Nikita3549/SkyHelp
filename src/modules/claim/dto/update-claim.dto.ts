import {
    IsArray,
    IsBoolean,
    IsDate,
    IsEmail,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    AirlineReason,
    CancellationNotice,
    ClaimStatus,
    DelayCategory,
    DisruptionType,
    PaymentMethod,
    ProgressStatus,
} from '@prisma/client';

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
}

export class UpdateClaimDto {
    @ValidateNested()
    @Type(() => DetailsDto)
    details: DetailsDto;

    @ValidateNested()
    @Type(() => PaymentDto)
    payment: PaymentDto;
}
