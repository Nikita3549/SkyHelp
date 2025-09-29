import { IsEnum, IsNumber, IsString } from 'class-validator';
import { ClaimStatus } from '@prisma/client';

export class CreateProgressDto {
    @IsEnum(ClaimStatus)
    status: ClaimStatus;

    @IsString()
    description: string;

    @IsNumber()
    order: number;
}
