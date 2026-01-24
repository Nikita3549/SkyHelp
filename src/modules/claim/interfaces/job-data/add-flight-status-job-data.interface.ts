export interface IAddFlightStatusJobData {
    flightNumber: string;
    airlineIcao: string;
    flightDate: Date;
    claimId: string;
    airportIcao?: string;
}
