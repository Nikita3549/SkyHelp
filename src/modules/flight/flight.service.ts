import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { GetFlightsDto } from './dto/get-flights.dto';
import { EARTH_RADIUS, KM, RADIAN } from './constants';
import { IFlightsResponse } from './interfaces/flight-radar-flight';
import {
    FlightAwareFlight,
    FlightAwareFlightsResponse,
} from './interfaces/flight-aware-flight';

@Injectable()
export class FlightService {
    constructor(private readonly configService: ConfigService) {}
    async getFlightByFlightCode(
        flightCode: number,
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

        return this.filterByDateFlights(res.data.flights, date)[0];
    }
    private filterByDateFlights(flights: FlightAwareFlight[], date: Date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const formattedDate = `${year}-${month}-${day}`;

        return flights.filter((f) => f.scheduled_out?.includes(formattedDate));
    }

    async getFlightsByDateAirportsCompany(dto: GetFlightsDto) {
        const { date: isoDate, company, departure, arrival } = dto;
        const date = new Date(isoDate);

        const { start: flightDateStart, end: flightDateEnd } =
            this.getFlightDateRange(date);

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

        return flights.filter((flight) => {
            return (
                flight.flight_ended &&
                new Date(flight.datetime_takeoff).getDay() == date.getDay()
            );
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
