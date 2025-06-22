import { IsString } from 'class-validator';

export class CustomerDto {
    @IsString()
    firstName: string;

    @IsString()
    lastName: string;

    @IsString()
    email: string;

    @IsString()
    phone: string;

    @IsString()
    address: string;
}
