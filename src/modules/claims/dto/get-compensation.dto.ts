import { IsBoolean, IsEnum, IsNumber, IsString } from 'class-validator';
import { CancellationNotice, DelayCategory } from '@prisma/client';

export class GetCompensationDto {
    // @IsString()
    // departureAirport: string;
    //
    // @IsString()
    // arrivalAirport: string;

    @IsEnum(DelayCategory)
    delayHours: DelayCategory;

    @IsEnum(CancellationNotice)
    cancellationNoticeDays: CancellationNotice;

    @IsBoolean()
    wasDeniedBoarding: boolean;

    @IsBoolean()
    wasAlternativeFlightOffered: boolean;

    @IsNumber()
    arrivalTimeDelayOfAlternative: number;

    @IsBoolean()
    wasDisruptionDuoExtraordinaryCircumstances: boolean;
}
