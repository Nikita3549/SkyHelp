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
import { IFlightStatus } from './interfaces/flight-status.interface';
import { ClaimFlightStatusSource } from '@prisma/client';
import { IOAGFlightInfo } from './interfaces/oag-flight-info.interface';
import { IFullOAGFlight } from './interfaces/oag-flight-full-info.interface';

@Injectable()
export class FlightService {
    constructor(private readonly configService: ConfigService) {}

    async getFlightFromFlightAware(
        flightCode: string,
        airlineIcao: string,
        date: Date,
    ): Promise<IFlightStatus | null> {
        try {
            const flightIdent = `${airlineIcao}${flightCode}`;

            const { end: flightDateEnd, start: flightDateStart } =
                this.getFlightDateRange(date);

            const resFlightAware = await axios.get<FlightAwareFlightsResponse>(
                `${this.configService.getOrThrow('FLIGHTAWARE_BASE_URL')}/history/flights/${flightIdent}`,
                {
                    params: {
                        start: flightDateStart
                            .toISOString()
                            .replace(/\.\d{3}Z$/, 'Z'),
                        end: flightDateEnd
                            .toISOString()
                            .replace(/\.\d{3}Z$/, 'Z'),
                    },
                    headers: {
                        ['x-apikey']: this.configService.getOrThrow(
                            'FLIGHTAWARE_API_KEY',
                        ),
                    },
                },
            );

            const flight = this.findFlightByDate(
                resFlightAware.data.flights,
                date,
            );

            if (flight) {
                const actualCancelled = !!flight?.cancelled;
                const delayMinutes = flight?.arrival_delay
                    ? Math.floor(flight.arrival_delay / 60)
                    : 0;

                return {
                    delayMinutes,
                    isCancelled: actualCancelled,
                    source: ClaimFlightStatusSource.FLIGHT_AWARE,
                };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    async getFlightFromFlightStats(
        flightCode: string,
        airlineIcao: string,
        date: Date,
    ): Promise<IFlightStatus | null> {
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
            if (res.data) {
                const flightStatus = res.data.flightStatuses[0];

                const actualCancelled =
                    flightStatus.status == 'C' || flightStatus.status == 'R'; // C - cancelled, R - redirected
                let delayMinutes = flightStatus.delays?.arrivalGateDelayMinutes
                    ? flightStatus.delays.arrivalGateDelayMinutes
                    : 0;

                const actual =
                    flightStatus.operationalTimes.actualGateArrival?.dateUtc ||
                    flightStatus.operationalTimes.actualRunwayArrival?.dateUtc;

                const scheduled =
                    flightStatus.operationalTimes.scheduledGateArrival?.dateUtc;

                if (delayMinutes == 0 && actual && scheduled) {
                    const actualDate = new Date(actual);
                    const scheduledDate = new Date(scheduled);
                    delayMinutes = Math.round(
                        (actualDate.getTime() - scheduledDate.getTime()) /
                            60000,
                    );
                }

                return {
                    source: ClaimFlightStatusSource.FLIGHT_STATS,
                    delayMinutes,
                    isCancelled: actualCancelled,
                };
            }

            return null;
        } catch (e) {
            return null;
        }
    }

    private findFlightByDate(
        flights: FlightAwareFlight[],
        date: Date,
    ): FlightAwareFlight | undefined {
        return flights.find(
            (f) =>
                f.scheduled_off &&
                f.scheduled_off.includes(formatDate(date, 'yyyy-mm-dd')),
        );
    }

    async getFlightFromOAG(
        flightCode: string,
        airlineCode: string,
        date: Date,
    ): Promise<IFlightStatus | null> {
        try {
            const formattedDate = formatDate(date, 'yyyy-mm-dd');

            const flightInfo = await axios.get<IOAGFlightInfo>(
                `https://api.oag.com/flight-instances/?DepartureDateTime=${formattedDate}&CarrierCode=${airlineCode}&FlightNumber=${flightCode}&version=v2&CodeType=ICAO`,
                {
                    headers: {
                        ['Subscription-Key']: this.configService.getOrThrow(
                            'OAG_SUBSCRIPTION_KEY',
                        ),
                    },
                },
            );

            const scheduleKey = flightInfo?.data?.data[0]?.scheduleInstanceKey;

            if (!scheduleKey) {
                return null;
            }

            const res = await axios.get<IFullOAGFlight>(
                `https://api.oag.com/flight-instances/${formattedDate}/${scheduleKey}?version=v2`,
                {
                    headers: {
                        ['Subscription-Key']: this.configService.getOrThrow(
                            'OAG_SUBSCRIPTION_KEY',
                        ),
                    },
                },
            );

            const fullFlight = res.data;

            const delayMinutes =
                this.getArrivalDelayMinutesForOAG(fullFlight) ?? 0;

            const actualCancelled = !(
                (!!fullFlight?.statusDetails![0].arrival?.actualTime ||
                    !!fullFlight?.statusDetails![0].departure?.estimatedTime
                        .offGround.utc) &&
                (!!fullFlight?.statusDetails![0].departure?.actualTime ||
                    !!fullFlight?.statusDetails![0].arrival?.estimatedTime
                        .onGround.utc)
            );

            const formattedFlight: IFlightStatus = {
                isCancelled: actualCancelled,
                delayMinutes,
                source: ClaimFlightStatusSource.OAG,
            };

            return formattedFlight;
        } catch (e) {
            console.log(e);
            return null;
        }
    }

    async getFlightsByDateAirportsCompany(
        dto: GetFlightsDto,
    ): Promise<IFlight[]> {
        const { arrival, date, company, departure } = dto;

        const url = `${this.configService.getOrThrow('FLIGHT_STATS_URL')}/flex/flightstatus/rest/v2/json/route/status/${departure}/${arrival}/dep/${date.getUTCFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;

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

    private getArrivalDelayMinutesForOAG(
        flight: IFullOAGFlight,
    ): number | null {
        const scheduledDate = flight.arrival?.date?.utc;
        const scheduledTime = flight.arrival?.time?.utc;
        const actualUtc =
            flight.statusDetails?.[0]?.arrival?.actualTime?.onGround?.utc;

        if (!scheduledDate || !scheduledTime || !actualUtc) return null;

        const scheduledIso = `${scheduledDate}T${scheduledTime}:00Z`;

        const scheduled = new Date(scheduledIso);
        const actual = new Date(actualUtc);

        if (isNaN(scheduled.getTime()) || isNaN(actual.getTime())) return null;

        const diffMs = actual.getTime() - scheduled.getTime();
        const diffMinutes = Math.round(diffMs / 60000);

        return diffMinutes;
    }
}
