import {
    IsString,
    IsBoolean,
    IsOptional,
    IsEmail,
    IsDate,
    IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer';

export class UpdatePassengerDto {
    @IsString()
    passengerId: string;

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

    @Type(() => Date)
    @IsDate()
    birthday: Date;

    @IsOptional()
    @IsEmail()
    email?: string | null;
}
