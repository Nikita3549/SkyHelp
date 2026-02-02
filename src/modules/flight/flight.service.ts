import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { GetFlightsDto } from './dto/get-flights.dto';
import { EARTH_RADIUS, KM, RADIAN } from './constants';
import {
    FlightAwareFlight,
    FlightAwareFlightsResponse,
} from './interfaces/flight-aware/flight-aware-flight';
import { IFlight } from './interfaces/flight';
import { formatDate } from '../../common/utils/formatDate';
import { FlightStatsResponse } from './interfaces/flight-stats/fight-stats-flight';
import { IFlightStatus } from './interfaces/flight-status.interface';
import { ClaimFlightStatusSource } from '@prisma/client';
import { IOAGFlightInfo } from './interfaces/oag/oag-flight-info.interface';
import { IFullOAGFlight } from './interfaces/oag/oag-flight-full-info.interface';
import { FlightIoFlightData } from './interfaces/flight-io/flight-io-flight-data';
import { parseFlightIoFlightStatus } from './utils/parse-flight-io-flight-status';
import { FlightIoFlightStatus } from './interfaces/flight-io/flight-io-flight-status';
import { IChisinauAirportFlight } from './interfaces/chisinau-airport/chisinau-airport-flight.interface';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class FlightService {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    async getFlightStatusFromFlightIo(
        flightCode: string,
        airlineCode: string,
        date: Date,
    ): Promise<IFlightStatus | null> {
        try {
            const url = this.configService.getOrThrow('FLIGHT_IO_URL');
            const accessToken = this.configService.getOrThrow(
                'FLIGHT_IO_ACCESS_TOKEN',
            );

            const res = await axios.get<FlightIoFlightStatus>(
                `${url}/airline/${accessToken}`,
                {
                    params: {
                        num: flightCode,
                        name: airlineCode,
                        date: `${date.getFullYear()}${date.getMonth() + 1}${date.getDate()}`,
                    },
                },
            );

            return {
                ...parseFlightIoFlightStatus(res.data),
                source: ClaimFlightStatusSource.FLIGHT_IO,
            };
        } catch (e) {
            return null;
        }
    }

    async getFlightsFromFlightIo(data: GetFlightsDto) {
        const { arrival, date, departure, company } = data;
        const url = this.configService.getOrThrow('FLIGHT_IO_URL');
        const accessToken = this.configService.getOrThrow(
            'FLIGHT_IO_ACCESS_TOKEN',
        );
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');

        const formattedDate = `${year}${month}${day}`;

        try {
            const res = await axios.get<FlightIoFlightData>(
                `${url}/trackbyroute/${accessToken}`,
                {
                    params: {
                        date: formattedDate,
                        airport1: departure,
                        airport2: arrival,
                    },
                },
            );

            return res.data.flights.filter((f) => f.airlineCode == company);
        } catch (e) {
            return [];
        }
    }

    async getFlightFromChisinauAirport(data: {
        flightCode: string;
        airlineIata: string;
        date: Date;
    }): Promise<IFlightStatus | null> {
        try {
            await this.prisma.flightStatusRequest.create({});

            const res = await axios.get<IChisinauAirportFlight>(
                `${this.configService.getOrThrow('CHISINAU_AIRPORT_API_URL')}/flights`,
                {
                    params: {
                        flight_no: `${data.airlineIata} ${data.flightCode}`,
                        date: formatDate(data.date, 'yyyy-mm-dd'),
                        airline: data.airlineIata,
                    },
                },
            );
            const flights = res.data.data;

            const flight = flights.at(-1);

            if (!flight) {
                return null;
            }

            return {
                delayMinutes: flight.delay_minutes,
                isCancelled: false,
                exactTime: new Date(flight.local_scheduled_time),
                source: ClaimFlightStatusSource.CHISINAU_AIRPORT,
            };
        } catch (_e) {
            return null;
        }
    }

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
                    exactTime: flight?.scheduled_out
                        ? new Date(flight?.scheduled_out)
                        : undefined,
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

            const status = fullFlight?.statusDetails?.[0]?.state;

            const actualCancelled =
                status === 'Canceled' ||
                status === 'Diverted' ||
                !(
                    (!!fullFlight?.statusDetails?.[0]?.arrival?.actualTime
                        ?.onGround?.utc ||
                        !!fullFlight?.statusDetails?.[0]?.departure?.actualTime
                            ?.offGround?.utc) &&
                    (!!fullFlight?.statusDetails?.[0]?.departure?.actualTime
                        ?.offGround?.utc ||
                        !!fullFlight?.statusDetails?.[0]?.arrival?.actualTime
                            ?.onGround?.utc)
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
        return (await this.getFlightsFromFlightIo(dto)).map((f) => ({
            id: `${f.airlineCode}${f.flightNumber}`,
            flightNumber: `${f.airlineCode}${f.flightNumber}`,
            departureTime: (f.scheduledTime
                ? f.scheduledTime
                : f.departureTime
            ).split(',')[0],
            arrivalTime: f.arrivalTime.split(',')[0],
            departureAirport: dto.departure,
            arrivalAirport: dto.arrival,
        }));
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
        const arrivalStatus = flight.statusDetails?.[0]?.arrival;
        const departureStatus = flight.statusDetails?.[0]?.departure;

        if (!arrivalStatus) return null;

        let actualUtc =
            arrivalStatus.actualTime?.inGate?.utc ||
            arrivalStatus.actualTime?.onGround?.utc ||
            arrivalStatus.estimatedTime?.inGate?.utc ||
            arrivalStatus.estimatedTime?.onGround?.utc;

        const scheduledUtc =
            flight.arrival?.date?.utc && flight.arrival?.time?.utc
                ? `${flight.arrival.date.utc}T${flight.arrival.time.utc}`
                : null;

        if (!scheduledUtc || !actualUtc) return null;

        const scheduled = new Date(scheduledUtc + 'Z');
        let actual = new Date(actualUtc);

        if (isNaN(scheduled.getTime()) || isNaN(actual.getTime())) return null;

        let diffMinutes = Math.round(
            (actual.getTime() - scheduled.getTime()) / 60000,
        );

        if (diffMinutes === 0 && departureStatus) {
            const depActualUtc =
                departureStatus.actualTime?.outGate?.utc ||
                departureStatus.actualTime?.offGround?.utc ||
                departureStatus.estimatedTime?.outGate?.utc ||
                departureStatus.estimatedTime?.offGround?.utc;

            const depScheduledUtc =
                flight.departure?.date?.utc && flight.departure?.time?.utc
                    ? `${flight.departure.date.utc}T${flight.departure.time.utc}`
                    : null;

            if (depActualUtc && depScheduledUtc) {
                const depScheduled = new Date(depScheduledUtc + 'Z');
                const depActual = new Date(depActualUtc);
                if (
                    !isNaN(depScheduled.getTime()) &&
                    !isNaN(depActual.getTime())
                ) {
                    diffMinutes = Math.round(
                        (depActual.getTime() - depScheduled.getTime()) / 60000,
                    );
                }
            }
        }

        return diffMinutes;
    }
}
