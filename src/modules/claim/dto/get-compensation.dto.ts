import { IsBoolean, IsEnum, IsNumber, IsOptional } from 'class-validator';
import { CancellationNotice, DelayCategory } from '@prisma/client';

export class GetCompensationDto {
    @IsOptional()
    @IsEnum(DelayCategory)
    delayHours: DelayCategory | null;

    @IsOptional()
    @IsEnum(CancellationNotice)
    cancellationNoticeDays: CancellationNotice | null;

    @IsBoolean()
    wasDeniedBoarding: boolean;

    @IsBoolean()
    wasAlternativeFlightOffered: boolean;

    @IsNumber()
    arrivalTimeDelayOfAlternative: number;

    @IsBoolean()
    wasDisruptionDuoExtraordinaryCircumstances: boolean;
}
