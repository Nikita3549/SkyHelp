import {
    IsString,
    IsEmail,
    IsOptional,
    IsEnum,
    IsBoolean,
    IsArray,
    ValidateNested,
    IsDate,
    IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import {
    AirlineReason,
    CancellationNotice,
    ClaimStatus,
    DelayCategory,
    DisruptionType,
    IssueReason,
    PaymentMethod,
} from '@prisma/client';

class RouteDto {
    @IsString()
    arrivalAirport: string;

    @IsString()
    departureAirport: string;

    @IsOptional()
    @IsBoolean()
    troubled?: boolean = false;
}

class DetailsDto {
    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsString()
    airline: string;

    @IsOptional()
    @IsString()
    bookingRef?: string;

    @IsString()
    flightNumber: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => RouteDto)
    routes: RouteDto[];
}

class StateDto {
    @IsEnum(ClaimStatus)
    status: ClaimStatus;

    @IsNumber()
    amount: number;
}

class CustomerDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsEmail()
    email: string;

    @IsString()
    phone: string;

    @IsString()
    address: string;

    @IsOptional()
    @IsString()
    secondAddress?: string;

    @IsString()
    city: string;

    @IsString()
    postalCode: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsString()
    country: string;

    @IsBoolean()
    whatsapp: boolean;
}

class IssueDto {
    @IsEnum(IssueReason)
    reason: IssueReason;

    @IsEnum(DelayCategory)
    delay: DelayCategory;

    @IsEnum(CancellationNotice)
    cancellationNoticeDays: CancellationNotice;

    @IsEnum(DisruptionType)
    disruptionType: DisruptionType;

    @IsOptional()
    @IsEnum(AirlineReason, {
        message: 'Invalid airline reason',
    })
    airlineReason: AirlineReason | null;

    @IsBoolean()
    wasAlternativeFlightOffered: boolean;

    @IsOptional()
    @IsNumber()
    arrivalTimeDelayOfAlternativeHours: number | null;

    @IsString()
    additionalInfo: string;
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
    routingNumber?: string;

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
    @Type(() => StateDto)
    state: StateDto;

    @ValidateNested()
    @Type(() => CustomerDto)
    customer: CustomerDto;

    @ValidateNested()
    @Type(() => IssueDto)
    issue: IssueDto;

    @ValidateNested()
    @Type(() => PaymentDto)
    payment: PaymentDto;
}
