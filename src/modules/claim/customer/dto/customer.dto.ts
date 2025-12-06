import { IsNumber, IsOptional, IsString } from 'class-validator';

export class CustomerDto {
    @IsString()
    claimId: string;

    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    email: string;

    @IsString()
    phone: string;

    @IsOptional()
    @IsString()
    address?: string;

    @IsOptional()
    @IsString()
    country?: string;

    @IsOptional()
    @IsString()
    city?: string;

    @IsOptional()
    @IsNumber()
    compensation?: number;
}
