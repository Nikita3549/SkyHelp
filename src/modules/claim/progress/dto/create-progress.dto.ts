import { IsEnum, IsNumber } from 'class-validator';
import { ClaimStatus } from '@prisma/client';

export class CreateProgressDto {
    @IsEnum(ClaimStatus)
    status: ClaimStatus;

    @IsNumber()
    order: number;
}
