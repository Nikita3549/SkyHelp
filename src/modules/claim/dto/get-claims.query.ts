import { IsOptional, IsString } from 'class-validator';

export class GetClaimsQuery {
    @IsOptional()
    @IsString()
    phone?: string;

    @IsOptional()
    @IsString()
    email?: string;
}
