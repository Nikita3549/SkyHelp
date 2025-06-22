import { IsOptional, IsString } from 'class-validator';

export class GetAdminClaimsQuery {
    @IsString()
    @IsOptional()
    userId?: string;

    @IsString()
    page: string;
}
