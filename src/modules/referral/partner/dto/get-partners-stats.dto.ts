import { IsOptional, IsString } from 'class-validator';

export class GetPartnersStatsDto {
    @IsString()
    @IsOptional()
    referralCode?: string;

    @IsString()
    @IsOptional()
    referralSource?: string;
}
