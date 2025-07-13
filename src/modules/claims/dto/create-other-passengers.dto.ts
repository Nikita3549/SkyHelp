import {
    IsArray,
    IsBoolean,
    IsDate,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

class OtherPassengerDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    address: string;

    @IsString()
    city: string;

    @IsString()
    country: string;

    @IsDate()
    @Type(() => Date)
    birthday: Date;

    @IsOptional()
    @IsString()
    email: string | null;
}

export class CreateOtherPassengersDto {
    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OtherPassengerDto)
    passengers: OtherPassengerDto[];
}
