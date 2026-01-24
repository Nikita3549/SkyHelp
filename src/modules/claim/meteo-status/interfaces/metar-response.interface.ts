export interface IAirportWeatherResponse {
    status: boolean;
    credits: number;
    airport: AirportInfo;
    metar: MetarData;
    runways: Runway[];
    stations: Station[];
}

export interface AirportInfo {
    id: string;
    iata: string;
    name: string;
    name_translated: string;
    city_name: string;
    admin1: string;
    admin2: string | null;
    country_id: string;
    country_name: string;
    lat: number;
    lng: number;
    metar: boolean;
    taf: boolean;
    timezone: number;
    fir: string;
    elevation: number;
    type: number;
    last_notam: number;
}

export interface MetarData {
    cavok: boolean;
    ceiling: number;
    ceiling_color: string;
    clouds: CloudLayer[];
    code: 'VFR' | 'IFR' | 'MVFR' | 'LIFR';
    code_color: string;
    colour_state: string | null;
    dewpoint: number;
    dewpoint_exact: number | null;
    humidity: number;
    is_day: boolean;
    observed: number;
    qnh: number;
    raw: string;
    recent_weather_report: string | null;
    remarks: string | null;
    runway_condition: any[];
    runway_visibility: any[];
    snoclo: boolean;
    station_id: string;
    sunrise: number;
    sunset: number;
    temperature: number;
    temperature_exact: number | null;
    trends: any[];
    vertical_visibility: number | null;
    visibility: number;
    visibility_sign: string;
    visibility_color: string;
    visibility_min: number | null;
    visibility_min_direction: string | null;
    warnings: any[];
    weather: string;
    weather_image: string;
    weather_report: string | null;
    wind_color: string;
    wind_dir: number;
    wind_dir_max: number;
    wind_dir_min: number;
    wind_gust: number | null;
    wind_speed: number;
    ws_all: any | null;
    ws_runways: any | null;
}

export interface CloudLayer {
    cover: string;
    base: number;
    type?: string;
}

export interface Runway {
    id_l: string;
    id_h: string;
    hdg_l: number;
    hdg_h: number;
    in_use: number;
    xwnd: number;
    hwnd: number;
}

export interface Station {
    id: string;
    name: string;
    taf: boolean;
}
