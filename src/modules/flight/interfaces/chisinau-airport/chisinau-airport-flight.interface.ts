export interface IChisinauAirportFlight {
    id: number;
    flight_no: string; // 'W4 3938'
    airline: string; // iata
    destination: string; // iata
    origin: string; // iata
    type: string;
    scheduled_time: string;
    actual_time: string | null;
    status: string | null;
    delay_minutes: number;
    created_at: string;
}
