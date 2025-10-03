import { IsArray, IsString, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class PassengerDto {
    @IsString()
    @IsOptional()
    passengerName: string | null;
}

export class SendBoardingPassData {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => PassengerDto)
    passengers: PassengerDto[];

    @IsString()
    @IsOptional()
    bookingRef: string | null;

    @IsString()
    flightNumber: string;

    @IsString()
    arrivalAirportIata: string;

    @IsString()
    departureAirportIata: string;

    @IsString()
    airlineIata: string;

    @IsString()
    @IsOptional()
    departureDate: string | null;

    @IsString()
    @IsOptional()
    arrivalDate: string | null;
}
