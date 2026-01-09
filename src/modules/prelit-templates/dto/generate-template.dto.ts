import { IsDate, IsEnum, IsString } from 'class-validator';
import { Transform } from 'class-transformer';

export enum CompensationAmount {
    SIX_HUNDRED = 600,
    FOUR_HUNDRED = 400,
    TWO_HUNDRED_AND_HALF = 250,
}

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

    @IsEnum(CompensationAmount)
    compensationAmount: CompensationAmount;

    @IsDate()
    @Transform(({ value }) => new Date(value))
    signedAt: Date;
}
