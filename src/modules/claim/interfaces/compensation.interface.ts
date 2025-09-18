import { CancellationNotice, DelayCategory } from '@prisma/client';

export interface IGetCompensation {
    flightDistanceKm: number;
    delayHours: DelayCategory | null;
    cancellationNoticeDays: CancellationNotice | null;
    wasDeniedBoarding: boolean;
    wasAlternativeFlightOffered: boolean;
    arrivalTimeDelayOfAlternative: number;
    wasDisruptionDuoExtraordinaryCircumstances: boolean;
}
