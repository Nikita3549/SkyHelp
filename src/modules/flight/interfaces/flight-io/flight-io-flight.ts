export interface FlightIoFlight {
    airline: string;
    airlineCode: string;
    flightNumber: number;
    status: number;
    displayStatus: string;
    operatedBy: string | null;
    scheduledTime: string | null;
    departureTime: string;
    arrivalTime: string;
    timeRemaining: string | null;
    codeshareServiceNumber: string | null;
    operatedByCode: string | null;
}
