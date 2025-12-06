import { IsDate, IsNumber, IsOptional, IsString } from 'class-validator';
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

    @IsNumber()
    @IsString()
    compensation?: number;

    @IsString()
    city: string;

    @IsString()
    country: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    birthday?: Date;

    @IsOptional()
    @IsString()
    email?: string | null;
}
