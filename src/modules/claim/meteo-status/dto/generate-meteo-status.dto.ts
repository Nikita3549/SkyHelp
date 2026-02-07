import { IsDate, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateMeteoStatusDto {
    @Type(() => Date)
    @IsDate()
    time: Date;

    @IsOptional()
    @IsString()
    airportIcao?: string | null;
}
