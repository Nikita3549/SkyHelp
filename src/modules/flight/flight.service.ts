import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { GetFlightsDto } from './dto/get-flights.dto';
import { EARTH_RADIUS, KM, RADIAN } from './constants';
import {
    IFlightRadarFlight,
    IFlightsResponse,
} from './interfaces/flight-radar-flight';
import { FlightAwareFlightsResponse } from './interfaces/flight-aware-flight';
import { IFlight } from './interfaces/flight';

@Injectable()
export class FlightService {
    constructor(private readonly configService: ConfigService) {}
    async getFlightByFlightCode(
        flightCode: string,
        airlineIcao: string,
        date: Date,
    ) {
        const flightIdent = `${airlineIcao}${flightCode}`;

        const { end: flightDateEnd, start: flightDateStart } =
            this.getFlightDateRange(date);

        const res = await axios.get<FlightAwareFlightsResponse>(
            `${this.configService.getOrThrow('FLIGHTAWARE_BASE_URL')}/history/flights/${flightIdent}`,
            {
                params: {
                    start: flightDateStart
                        .toISOString()
                        .replace(/\.\d{3}Z$/, 'Z'),
                    end: flightDateEnd.toISOString().replace(/\.\d{3}Z$/, 'Z'),
                },
                headers: {
                    ['x-apikey']: this.configService.getOrThrow(
                        'FLIGHTAWARE_API_KEY',
                    ),
                },
            },
        );

        return res.data.flights[0];
    }

    async getFlightsByDateAirportsCompany(
        dto: GetFlightsDto,
    ): Promise<IFlight[]> {
        const { date: isoDate, company, departure, arrival } = dto;
        const date = new Date(isoDate);

        const { start: flightDateStart, end: flightDateEnd } =
            this.getFlightDateRange(date);

        // --- 1. FlightAware ---
        const flightAwareResponse: AxiosResponse<any> = await axios
            .get(
                `${this.configService.getOrThrow('FLIGHTAWARE_BASE_URL')}/schedules/${flightDateStart.toISOString().split('T')[0]}/${flightDateEnd.toISOString().split('T')[0]}`,
                {
                    params: {
                        origin: departure,
                        destination: arrival,
                        airline: company,
                    },
                    headers: {
                        'x-apikey': this.configService.getOrThrow(
                            'FLIGHTAWARE_API_KEY',
                        ),
                        Accept: 'application/json',
                    },
                },
            )
            .catch();

        const scheduled = flightAwareResponse.data?.scheduled ?? [];

        if (scheduled.length > 0) {
            return scheduled.map((f: any): IFlight => {
                return {
                    id: f.ident_iata || f.ident || '',
                    flightNumber: f.ident_iata || f.ident || '',
                    departureTime: f.scheduled_out,
                    arrivalTime: f.scheduled_in,
                    departureAirport: f.origin_icao,
                    arrivalAirport: f.destination_icao,
                };
            });
        }

        // --- 2. FlightRadar (fallback) ---
        const flightsResponse: AxiosResponse<IFlightsResponse> =
            await axios.get(
                `${this.configService.getOrThrow('FLIGHT_RADAR_API_HOST')}/api/flight-summary/full`,
                {
                    params: {
                        flight_datetime_from: flightDateStart
                            .toISOString()
                            .replace(/\.\d{3}Z$/, 'Z'),
                        flight_datetime_to: flightDateEnd
                            .toISOString()
                            .replace(/\.\d{3}Z$/, 'Z'),
                        routes: `${departure}-${arrival}`,
                        operating_as: company,
                    },
                    headers: {
                        Authorization: `Bearer ${this.configService.getOrThrow('FLIGHT_RADAR_API_KEY')}`,
                        Accept: 'application/json',
                        'Accept-Version': 'v1',
                    },
                },
            );

        const flights = flightsResponse.data.data;

        return flights
            .filter((flight) => {
                return (
                    flight.flight_ended &&
                    new Date(flight.datetime_takeoff).getDay() === date.getDay()
                );
            })
            .map((f: IFlightRadarFlight): IFlight => {
                return {
                    id: f.fr24_id,
                    flightNumber: f.flight,
                    departureTime: f.datetime_takeoff,
                    arrivalTime: f.datetime_landed!,
                    departureAirport: f.orig_icao,
                    arrivalAirport: f.dest_icao,
                };
            });
    }

    calculateDistanceBetweenAirports(
        latA: number,
        lonA: number,
        altA: number,
        latB: number,
        lonB: number,
        altB: number,
    ): number {
        const earthRadiusKm = EARTH_RADIUS;

        const radiusA = earthRadiusKm + altA / KM;
        const radiusB = earthRadiusKm + altB / KM;

        const latRadA = this.toRadians(latA);
        const lonRadA = this.toRadians(lonA);
        const latRadB = this.toRadians(latB);
        const lonRadB = this.toRadians(lonB);

        const xA = radiusA * Math.cos(latRadA) * Math.cos(lonRadA);
        const yA = radiusA * Math.cos(latRadA) * Math.sin(lonRadA);
        const zA = radiusA * Math.sin(latRadA);

        const xB = radiusB * Math.cos(latRadB) * Math.cos(lonRadB);
        const yB = radiusB * Math.cos(latRadB) * Math.sin(lonRadB);
        const zB = radiusB * Math.sin(latRadB);

        const deltaX = xB - xA;
        const deltaY = yB - yA;
        const deltaZ = zB - zA;

        const distance = Math.sqrt(deltaX ** 2 + deltaY ** 2 + deltaZ ** 2);
        return distance;
    }

    private toRadians(degrees: number): number {
        return degrees * RADIAN;
    }

    getFlightDateRange(date: Date) {
        if (new Date() < date) {
            throw new Error('Flight date is later than now');
        }

        const start = new Date(date);
        start.setUTCDate(start.getUTCDate());
        start.setUTCHours(0, 0, 0, 0);

        const end = new Date(date);
        end.setUTCDate(end.getUTCDate() + 1);
        end.setUTCHours(23, 59, 59, 999);

        return { start, end };
    }
}
