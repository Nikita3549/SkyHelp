import { ClaimFlightStatusSource } from '@prisma/client';

export interface IFlightStatus {
    delayMinutes: number;
    isCancelled: boolean;
    source: ClaimFlightStatusSource;
}
