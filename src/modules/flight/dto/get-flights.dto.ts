import { IsDate, IsISO8601, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GetFlightsDto {
    @IsString()
    company: string;

    @IsDate()
    @Type(() => Date)
    date: Date;

    @IsString()
    departure: string;

    @IsString()
    arrival: string;
}
