import { IsString } from 'class-validator';

export class SaveReferralLinkClickDto {
    @IsString()
    source: string;

    @IsString()
    referralCode: string;
}
