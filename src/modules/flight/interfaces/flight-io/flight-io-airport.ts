export interface FlightIoAirport {
    id: number;
    code: string;
    name: string;
    nameBrief: string;
    city: string;
    state: string;
    country: string;
    countryCode: string;
    listOnlyLookup: boolean;
    latitude: number;
    longitude: number;
    airportSlug: string;
}
