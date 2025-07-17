import { IsISO8601, IsString } from 'class-validator';

export class GetFlightsDto {
    @IsString()
    company: string;

    @IsISO8601()
    date: string;

    @IsString()
    departure: string;

    @IsString()
    arrival: string;
}
