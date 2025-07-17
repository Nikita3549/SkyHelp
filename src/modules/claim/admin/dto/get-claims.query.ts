import { IsEnum, IsOptional, IsString } from 'class-validator';
enum IsArchived {
    YES = 'yes',
    NO = 'no',
}

export class GetClaimsQuery {
    @IsString()
    @IsOptional()
    userId?: string;

    @IsString()
    page: string;

    @IsOptional()
    @IsEnum(IsArchived)
    archived: IsArchived;
}
