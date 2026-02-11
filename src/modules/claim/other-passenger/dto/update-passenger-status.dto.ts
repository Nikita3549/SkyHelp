import { ClaimStatus } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdatePassengerStatusDto {
    @IsEnum(ClaimStatus)
    status: ClaimStatus;
}
