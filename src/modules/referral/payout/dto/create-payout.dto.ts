import { IsNumber, IsString } from 'class-validator';

export class CreatePayoutDto {
    @IsNumber()
    amount: number;

    @IsString()
    partnerId: string;
}
