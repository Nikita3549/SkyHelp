import { IsArray, IsOptional, IsString } from 'class-validator';

export class FlightDto {
    @IsString()
    claimId: string;

    @IsString()
    airline: string;

    @IsString()
    date: string;

    @IsString()
    flightNumber: string;

    @IsOptional()
    @IsString()
    bookingRef?: string;

    @IsArray()
    routes: {
        arrivalAirport: string;
        arrivalIcao: string;
        departureAirport: string;
        departureIcao: string;
        troubled: boolean;
    }[];
}
