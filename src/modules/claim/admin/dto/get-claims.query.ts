import { IsDate, IsEnum, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimStatus } from '@prisma/client';
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

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    startDate?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    endDate?: Date;

    @IsOptional()
    @IsEnum(ClaimStatus)
    status?: ClaimStatus;

    @IsOptional()
    @IsString()
    icao?: string;

    @IsOptional()
    @IsString()
    flightNumber?: string
}
