export interface IFlight {
    id: string;
    flightNumber: string;
    departureTime: string;
    arrivalTime: string;
    departureAirport: string | undefined;
    arrivalAirport: string | undefined;
}
