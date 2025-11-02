import { IsOptional, IsString } from 'class-validator';

export class GetReferralLinksDto {
    @IsOptional()
    @IsString()
    userId?: string;
}
