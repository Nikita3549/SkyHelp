import { IsOptional, IsString } from 'class-validator';

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
}
