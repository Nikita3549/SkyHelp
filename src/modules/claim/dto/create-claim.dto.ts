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
    DelayCategory,
    DisruptionType,
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

class StateDto {
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

    @IsString()
    city: string;

    @IsString()
    country: string;

    @IsOptional()
    @IsString()
    state?: string;

    @IsBoolean()
    whatsapp: boolean;
}

class IssueDto {
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

export class CreateClaimDto {
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
}
