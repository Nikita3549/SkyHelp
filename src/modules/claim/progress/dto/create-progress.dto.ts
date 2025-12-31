import {
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
} from 'class-validator';
import { ClaimStatus } from '@prisma/client';

export class CreateProgressDto {
    @IsEnum(ClaimStatus)
    status: ClaimStatus;

    @IsString()
    description: string;

    @IsNumber()
    order: number;

    @IsOptional()
    @IsString()
    comments?: string;

    @IsObject()
    @IsOptional()
    additionalData?: Record<string, string>;
}
