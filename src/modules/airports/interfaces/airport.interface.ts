export interface IAirport {
    icao: string;
    iata: string | null;
    name: string;
    city: string;
    region: string;
    country: string;
    elevation_ft: number;
    latitude: number;
    longitude: number;
    timezone: string;
}
