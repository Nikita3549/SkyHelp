import { IsOptional, IsString } from 'class-validator';

export class CreateReferralLinkDto {
    @IsString()
    source: string;

    @IsString()
    @IsOptional()
    referralCode: string;
}
