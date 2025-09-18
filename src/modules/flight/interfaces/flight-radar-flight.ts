export interface IFlightRadarFlight {
    fr24_id: string;
    flight: string;
    callsign: string;
    operating_as: string;
    painted_as: string;
    type: string;
    reg: string;
    orig_icao: string;
    orig_iata: string;
    datetime_takeoff: string; // ISO
    runway_takeoff: string;
    dest_icao: string;
    dest_iata: string;
    dest_icao_actual: string;
    dest_iata_actual: string;
    datetime_landed: string | null;
    runway_landed: string | null;
    flight_time: number | null; // seconds
    actual_distance: number; // km
    circle_distance: number; // km
    category: string;
    hex: string;
    first_seen: string;
    last_seen: string;
    flight_ended: boolean;
}

export interface IFlightsResponse {
    data: IFlightRadarFlight[];
}
