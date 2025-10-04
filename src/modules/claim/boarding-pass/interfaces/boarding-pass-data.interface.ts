import { IAirline } from '../../../airline/interfaces/airline.interface';
import { IDbAirport } from '../../../airport/interfaces/db-airport.interface';

export interface IBoardingPassData {
    passengers: {
        passengerName: string | null;
    }[];
    bookingRef: string | null;
    flightNumber: string;
    arrivalAirport: IDbAirport;
    departureAirport: IDbAirport;
    airline: IAirline;
    departureDate: string | null;
    arrivalDate: string | null;
}
