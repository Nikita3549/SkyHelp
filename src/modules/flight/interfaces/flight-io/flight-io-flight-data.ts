import { FlightIoFlight } from './flight-io-flight';
import { FlightIoAirport } from './flight-io-airport';

export interface FlightIoFlightData {
    flights: FlightIoFlight[];
    departureAirport: FlightIoAirport;
    arrivalAirport: FlightIoAirport;
}
