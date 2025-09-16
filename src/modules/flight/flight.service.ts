import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios, { AxiosResponse } from 'axios';
import { IFlightsResponse } from './interfaces/flights.interface';
import { GetFlightsDto } from './dto/get-flights.dto';
import { EARTH_RADIUS, KM, RADIAN } from './constants';

@Injectable()
export class FlightService {
    constructor(private readonly configService: ConfigService) {}

    async getFlightsByDateAirportsCompany(dto: GetFlightsDto) {
        const { date: isoDate, company, departure, arrival } = dto;
        const date = new Date(isoDate);

        if (new Date() < date) {
            throw new Error('Flight date is later than now');
        }
        const flightDateFrom = new Date(date);
        flightDateFrom.setUTCDate(flightDateFrom.getUTCDate() - 1);
        flightDateFrom.setUTCHours(0, 0, 0, 0);

        const flightDateTo = new Date(date);
        flightDateTo.setUTCDate(flightDateTo.getUTCDate() + 1);
        flightDateTo.setUTCHours(23, 59, 59, 999);

        const flightsResponse: AxiosResponse<IFlightsResponse> =
            await axios.get(
                `${this.configService.getOrThrow('FLIGHT_RADAR_API_HOST')}/api/flight-summary/full`,
                {
                    params: {
                        flight_datetime_from: flightDateFrom
                            .toISOString()
                            .replace(/\.\d{3}Z$/, 'Z'),
                        flight_datetime_to: flightDateTo
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

    // async getFlightById(flightId: string) {
    //     constants flightsResponse: AxiosResponse<IFlightsResponse> =
    //         await axios.get(
    //             `${this.configService.getOrThrow('FLIGHT_RADAR_API_HOST')}/api/flight-summary/full`,
    //             {
    //                 params: {
    //                     flight_ids: flightId,
    //                 },
    //                 headers: {
    //                     Authorization: `Bearer ${this.configService.getOrThrow('FLIGHT_RADAR_API_KEY')}`,
    //                     Accept: 'application/json',
    //                     'Accept-Version': 'v1',
    //                 },
    //             },
    //         );
    //     if (flightsResponse.status != 200) {
    //         throw new Error('Bad request');
    //     }
    //     return flightsResponse.data.data[0];
    // }

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
}
