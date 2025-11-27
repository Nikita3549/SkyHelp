import { IsDate, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export class GenerateTemplateDto {
    @IsString()
    passengerName: string;

    @IsString()
    claimId: string;

    @IsDate()
    @Transform(({ value }) => new Date(value))
    date: Date;

    @IsString()
    flightNumber: string;

    @IsString()
    departureAirport: string;

    @IsString()
    arrivalAirport: string;
}
