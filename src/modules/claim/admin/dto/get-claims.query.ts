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

export enum YesOrNo {
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
    @IsEnum(YesOrNo)
    archived: YesOrNo;

    @IsOptional()
    @IsEnum(YesOrNo)
    duplicated: YesOrNo;

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

    @IsOptional()
    @IsString()
    agentId?: string;

    @IsOptional()
    @IsEnum(YesOrNo)
    onlyRecentlyUpdates: YesOrNo;

    @IsOptional()
    @IsString()
    referralCode?: string;

    @IsOptional()
    @IsEnum(YesOrNo)
    withPartner?: YesOrNo;

    @IsOptional()
    @IsString()
    airlineIata?: string;

    @IsOptional()
    @IsString()
    departureAirportIcao?: string;

    @IsOptional()
    @IsString()
    arrivalAirportIcao?: string;
}
