import { IsDate, IsEmail, IsOptional, IsString } from 'class-validator';
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

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    birthday: Date;

    @IsOptional()
    @IsEmail()
    email?: string | null;
}
