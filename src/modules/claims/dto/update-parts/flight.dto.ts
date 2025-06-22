import { IsArray, IsString } from 'class-validator';

export class FlightDto {
    @IsString()
    airline: string;

    @IsString()
    date: string;

    @IsString()
    flightNumber: string;

    @IsArray()
    routes: {
        arrivalAirport: string;
        arrivalIcao: string;
        departureAirport: string;
        departureIcao: string;
        troubled: boolean;
    }[];
}
