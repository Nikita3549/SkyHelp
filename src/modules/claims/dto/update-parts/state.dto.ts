import { ClaimStatus } from '@prisma/client';
import { IsEnum, IsNumber } from 'class-validator';

export class StateDto {
    @IsEnum(ClaimStatus)
    status: ClaimStatus;

    @IsNumber()
    amount: number;
}
