import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';
import {
    CancellationNotice,
    DelayCategory,
    DisruptionType,
} from '@prisma/client';

export class GetCompensationDto {
    @IsEnum(DisruptionType)
    disruptionType: DisruptionType;

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

    @IsString()
    depIcao: string;

    @IsString()
    arrIcao: string;

    @IsString()
    airlineIcao: string;
}
