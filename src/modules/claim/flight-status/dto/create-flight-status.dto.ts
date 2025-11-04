import { IsEnum, IsString } from 'class-validator';
import { ClaimFlightStatusSource } from '@prisma/client';

export class CreateFlightStatusDto {
    @IsString()
    claimId: string;

    @IsEnum(ClaimFlightStatusSource)
    source: ClaimFlightStatusSource;
}
