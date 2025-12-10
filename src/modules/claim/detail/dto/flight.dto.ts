import { IsOptional, IsString } from 'class-validator';

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

export class FlightDto {
    @IsString()
    claimId: string;

    @IsString()
    date: string;

    @IsString()
    flightNumber: string;

    @IsOptional()
    @IsString()
    bookingRef?: string;

    @IsOptional()
    airline?: AirlineUpdateDto;

    @IsOptional()
    arrivalAirport?: AirportUpdateDto;

    @IsOptional()
    departureAirport?: AirportUpdateDto;
}
