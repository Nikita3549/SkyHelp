import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { GetFlightsDto } from './dto/get-flights.dto';
import { EARTH_RADIUS, KM, RADIAN } from './constants';
import {
    IFlightRadarFlight,
    IFlightsResponse,
} from './interfaces/flight-radar-flight';
import {
    FlightAwareFlight,
    FlightAwareFlightsResponse,
} from './interfaces/flight-aware-flight';
import { IFlight } from './interfaces/flight';
import { formatDate } from '../../utils/formatDate';
import {
    FlightStatsResponse,
    IFlightStatsFlight,
} from './interfaces/fight-stats-flight';

@Injectable()
export class FlightService {
    constructor(private readonly configService: ConfigService) {}

    async getFlightByFlightCode(
        flightCode: string,
        airlineIcao: string,
        date: Date,
    ): Promise<IFlightStatsFlight | null> {
        try {
            const url = `${this.configService.getOrThrow('FLIGHT_STATS_URL')}/flex/flightstatus/rest/v2/json/flight/status/${airlineIcao}/${flightCode}/dep/${date.getUTCFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

            const res = await axios.get<FlightStatsResponse>(url, {
                params: {
                    appId: this.configService.getOrThrow('FLIGHT_STATS_APP_ID'),
                    appKey: this.configService.getOrThrow(
                        'FLIGHT_STATS_API_KEY',
                    ),
                },
            });

            return res.data ? res.data.flightStatuses[0] : null;
        } catch (e) {
            return null;
        }
    }

    async getFlightsByDateAirportsCompany(
        dto: GetFlightsDto,
    ): Promise<IFlight[]> {
        const { arrival, date, company, departure } = dto;

        const url = `${this.configService.getOrThrow('FLIGHT_STATS_URL')}/flex/flightstatus/rest/v2/json/route/status/${departure}/${arrival}/dep/${date.getUTCFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
        console.log(url);

        try {
            const res = await axios.get<FlightStatsResponse>(url, {
                params: {
                    appId: this.configService.getOrThrow('FLIGHT_STATS_APP_ID'),
                    appKey: this.configService.getOrThrow(
                        'FLIGHT_STATS_API_KEY',
                    ),
                },
            });

            const airline = res.data.appendix.airlines.find(
                (a) => a.icao == company || a.iata == company,
            );

            if (!airline) {
                return [];
            }

            const flights = res.data.flightStatuses;

            return flights
                .filter(
                    (f) =>
                        f.carrierFsCode == airline.iata ||
                        f.carrierFsCode == airline.icao,
                )
                .map((f) => ({
                    id: `${airline.iata}${f.flightNumber}`,
                    arrivalAirport: f.arrivalAirportFsCode,
                    departureAirport: f.departureAirportFsCode,
                    flightNumber: `${airline.iata}${f.flightNumber}`,
                    departureTime: f.departureDate.dateLocal,
                    arrivalTime: f.arrivalDate.dateLocal,
                }));
        } catch (e) {}

        return [];
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
