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
    ProgressStatus,
} from '@prisma/client';
class AirportDto {
    @IsString()
    icao: string;

    @IsString()
    name: string;
}

class RouteDto {
    @ValidateNested()
    @Type(() => AirportDto)
    arrivalAirport: AirportDto;

    @ValidateNested()
    @Type(() => AirportDto)
    departureAirport: AirportDto;

    @IsOptional()
    @IsBoolean()
    troubled?: boolean = false;
}

class AirlineDto {
    @IsString()
    icao: string;

    @IsString()
    name: string;
}

class DetailsDto {
    @IsDate()
    @Type(() => Date)
    date: Date;

    @ValidateNested()
    @Type(() => AirportDto)
    airline: AirlineDto;

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

class ProgressStepDto {
    @IsString()
    title: string;

    @IsString()
    description: string;

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    endAt: Date;

    @IsEnum(ProgressStatus)
    status: ProgressStatus;
}

class StateDto {
    @IsNumber()
    amount: number;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => ProgressStepDto)
    progress: ProgressStepDto[];

    @IsEnum(ClaimStatus)
    status: ClaimStatus;
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
    // @IsEnum(IssueReason)
    // reason: IssueReason;

    @IsOptional()
    @IsEnum(DelayCategory)
    delay: DelayCategory;

    @IsOptional()
    @IsEnum(CancellationNotice)
    cancellationNoticeDays: CancellationNotice;

    @IsEnum(DisruptionType)
    disruptionType: DisruptionType;

    @IsOptional()
    @IsEnum(AirlineReason)
    airlineReason: AirlineReason | null;

    @IsOptional()
    @IsBoolean()
    wasAlternativeFlightOffered: boolean | null;

    @IsOptional()
    @IsNumber()
    arrivalTimeDelayOfAlternativeHours: number | null;

    @IsOptional()
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
