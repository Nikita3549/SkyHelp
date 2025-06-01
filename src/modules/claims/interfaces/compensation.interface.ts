import { CancellationNotice, DelayCategory } from '@prisma/client';

export interface IGetCompensation {
    // departureAirport: string;
    // arrivalAirport: string;
    flightDistanceKm: number;
    delayHours: DelayCategory;
    cancellationNoticeDays: CancellationNotice;
    wasDeniedBoarding: boolean;
    wasAlternativeFlightOffered: boolean;
    arrivalTimeDelayOfAlternative: number;
    wasDisruptionDuoExtraordinaryCircumstances: boolean;
}
