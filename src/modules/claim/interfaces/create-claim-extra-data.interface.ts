export interface ICreateClaimExtraData {
    language?: string;
    referrer?: string;
    referredById: string | null;
    referrerSource?: string;
    userId?: string | null;
    flightNumber: string;
    fullRoutes: IFullRouteData[];
}

export interface IFullRouteData {
    troubled: boolean | undefined;
    departureAirport: IAirportData;
    arrivalAirport: IAirportData;
}

export interface IAirportData {
    icao: string;
    iata: string;
    name: string;
    country: string;
}
