import { IsDate, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class AirportUpdateDto {
    @IsString()
    id: string;

    @IsOptional()
    @IsString()
    icao?: string;

    @IsOptional()
    @IsString()
    iata?: string;

    @IsOptional()
    @IsString()
    name?: string;

    @IsOptional()
    @IsString()
    country?: string;
}

class AirlineUpdateDto {
    @IsOptional()
    @IsString()
    icao?: string;

    @IsOptional()
    @IsString()
    iata?: string;

    @IsOptional()
    @IsString()
    name?: string;
}

export class UpdateDetailsDto {
    @IsString()
    claimId: string;

    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsOptional()
    @IsString()
    flightNumber?: string;

    @IsOptional()
    @IsString()
    bookingRef?: string;

    @IsOptional()
    airline?: AirlineUpdateDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => AirportUpdateDto)
    arrivalAirport?: AirportUpdateDto;

    @IsOptional()
    @ValidateNested()
    @Type(() => AirportUpdateDto)
    departureAirport?: AirportUpdateDto;

    @IsOptional()
    @IsString()
    airlineLink?: string;

    hasTime?: boolean;
}
