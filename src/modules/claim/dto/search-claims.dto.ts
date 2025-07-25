import { IsOptional, IsString } from 'class-validator';

export class SearchClaimsDto {
    @IsOptional()
    @IsString()
    claimId?: string;

    @IsOptional()
    @IsString()
    firstName?: string;

    @IsOptional()
    @IsString()
    lastName?: string;

    @IsOptional()
    @IsString()
    date?: string;
}
