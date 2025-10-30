import { IsString } from 'class-validator';

export class CreatePartnerDto {
    @IsString()
    referralCode: string;

    @IsString()
    userId: string;
}
