import {
    IsArray,
    IsBoolean,
    IsDate,
    IsOptional,
    IsString,
    ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class OtherPassengerDto {
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

    @IsOptional()
    @IsDate()
    @Type(() => Date)
    birthday: Date;

    @IsOptional()
    @IsString()
    email: string;

    @IsOptional()
    @IsBoolean()
    isMinor: boolean = false;

    @IsOptional()
    @IsString()
    parentFirstName: string;

    @IsOptional()
    @IsString()
    parentLastName: string;
}

export class CreateOtherPassengersDto {
    @IsString()
    claimId: string;

    @IsArray()
    @ValidateNested({ each: true })
    @Type(() => OtherPassengerDto)
    passengers: OtherPassengerDto[];
}
