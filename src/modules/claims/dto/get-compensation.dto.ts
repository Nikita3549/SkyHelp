import {
    IsBoolean,
    IsEnum,
    IsNumber,
    IsOptional,
    IsString,
} from 'class-validator';
import { CancellationNotice, DelayCategory } from '@prisma/client';

export class GetCompensationDto {
    // @IsString()
    // departureAirport: string;
    //
    // @IsString()
    // arrivalAirport: string;

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
