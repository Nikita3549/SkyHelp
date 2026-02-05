import { IsEnum } from 'class-validator';
import { ClaimDiscrepancyStatus } from '@prisma/client';

export class UpdateDiscrepancyStatusDto {
    @IsEnum(ClaimDiscrepancyStatus)
    status: ClaimDiscrepancyStatus;
}
