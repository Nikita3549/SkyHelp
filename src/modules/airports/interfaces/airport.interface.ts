export interface IAirports {
    data: {
        id: string;
        gmt: string;
        airport_id: string;
        iata_code: string;
        city_iata_code: string;
        icao_code: string;
        country_iso2: string;
        geoname_id: string;
        latitude: string;
        longitude: string;
        airport_name: string;
        country_name: string;
        phone_number: string;
        timezone: string;
    }[];
}
