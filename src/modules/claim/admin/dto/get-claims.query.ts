import {
    IsDate,
    IsEnum,
    IsInt,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ClaimStatus, UserRole } from '@prisma/client';
enum IsArchived {
    YES = 'yes',
    NO = 'no',
}

export class GetClaimsQuery {
    @IsString()
    @IsOptional()
    userId?: string;

    @Type(() => Number)
    @IsInt()
    @Min(1)
    page: number;

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
    flightNumber?: string;

    @IsOptional()
    @IsEnum(UserRole)
    role?: UserRole;
}
