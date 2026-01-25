import { IsDate } from 'class-validator';
import { Type } from 'class-transformer';

export class GenerateMeteoStatusDto {
    @Type(() => Date)
    @IsDate()
    time: Date;
}
