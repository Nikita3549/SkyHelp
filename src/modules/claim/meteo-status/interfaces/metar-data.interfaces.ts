import { MeteoStatusReason } from '@prisma/client';

export interface IRunwayStatus {
    id: string;
    crosswindKt: number;
    headwindKt: number;
    isSafe: boolean;
}

export interface IDecisionStatus {
    takeoffOk: boolean;
    landingOk: boolean;
    reason: MeteoStatusReason | null;
}

export interface IMeteoData {
    observedTimeUtc: string;
    ceilingFt: number | null;
    runways: IRunwayStatus[];
    visibilityM: number;
    windDir: number;
    windSpeedKt: number;
    windGustKt: number | null;

    isSnoclo: boolean;
    hasWindshear: boolean;
    rawMetarText: string;

    decision: IDecisionStatus;
}
