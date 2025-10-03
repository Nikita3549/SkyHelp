import { IDbAirport } from 'src/modules/airport/interfaces/db-airport.interface';
import { IAirline } from '../../../airline/interfaces/airline.interface';

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
