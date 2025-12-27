import {
    CancellationNotice,
    DelayCategory,
    DisruptionType,
} from '@prisma/client';

export interface IGetCompensation {
    flightDistanceKm: number;
    delayHours: DelayCategory | null;
    cancellationNoticeDays: CancellationNotice | null;
    wasDeniedBoarding: boolean;
    wasAlternativeFlightOffered: boolean;
    arrivalTimeDelayOfAlternative: number;
    wasDisruptionDuoExtraordinaryCircumstances: boolean;
    airlineIcao: string;
    disruptionType: DisruptionType;
}
