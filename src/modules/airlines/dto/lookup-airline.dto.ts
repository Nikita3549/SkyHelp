import { IsString } from 'class-validator';

export class LookupAirlineDto {
    @IsString()
    name: string;
}
