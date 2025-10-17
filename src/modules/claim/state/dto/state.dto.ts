import { ClaimStatus } from '@prisma/client';
import { IsEnum, IsNumber, IsOptional, IsString } from 'class-validator';

export class StateDto {
    @IsString()
    claimId: string;

    @IsEnum(ClaimStatus)
    status: ClaimStatus;

    @IsNumber()
    amount: number;

    @IsOptional()
    @IsString()
    comments?: string;
}
