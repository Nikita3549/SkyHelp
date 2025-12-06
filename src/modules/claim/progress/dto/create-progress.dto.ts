import {
    IsEnum,
    IsNumber,
    IsObject,
    IsOptional,
    IsString,
    Validate,
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
    @Validate((value: object) => {
        return Object.values(value).every((v) => typeof v === 'string');
    })
    additionalData: Record<string, string>;
}
