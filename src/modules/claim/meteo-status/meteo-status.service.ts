import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { IAirportWeatherResponse } from './interfaces/metar-response.interface';
import {
    IMeteoData,
    IRunwayStatus,
    IDecisionStatus,
} from './interfaces/metar-data.interfaces';
import { PrismaService } from '../../prisma/prisma.service';
import { MeteoStatusReason } from '@prisma/client';

@Injectable()
export class MeteoStatusService {
    constructor(
        private configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    async getByClaimId(claimId: string): Promise<IMeteoData | null> {
        const entity = await this.prisma.meteoStatus.findFirst({
            where: { claimId },
            include: { runways: true },
        });

        if (!entity) return null;

        return {
            observedTimeUtc: entity.observedTimeUtc?.toISOString() || '',
            visibilityM: entity.visibilityM || 0,
            windDir: entity.windDir || 0,
            windSpeedKt: entity.windSpeedKt || 0,
            windGustKt: entity.windGustKt,
            ceilingFt: entity.ceilingFt,
            isSnoclo: entity.isSnoclo || false,
            hasWindshear: entity.hasWindshear || false,
            rawMetarText: entity.rawMetarText || '',
            runways: entity.runways?.map((r) => ({
                id: r.runwayId || '',
                crosswindKt: r.crosswindKt || 0,
                headwindKt: r.headwindKt || 0,
                isSafe: r.isSafe,
            })),
            decision: {
                takeoffOk: entity.takeoffOk,
                landingOk: entity.landingOk,
                reason: entity.reason,
            },
        };
    }

    async create(data: IMeteoData, claimId: string) {
        return this.prisma.meteoStatus.create({
            data: {
                claimId: claimId,
                observedTimeUtc: new Date(data.observedTimeUtc),
                visibilityM: data.visibilityM,
                windDir: data.windDir,
                windSpeedKt: data.windSpeedKt,
                windGustKt: data.windGustKt,
                ceilingFt: data.ceilingFt,
                isSnoclo: data.isSnoclo,
                hasWindshear: data.hasWindshear,
                rawMetarText: data.rawMetarText,
                takeoffOk: data.decision.takeoffOk,
                landingOk: data.decision.landingOk,
                reason: data.decision.reason,
                runways: {
                    create: data.runways?.map((r) => ({
                        runwayId: r.id,
                        crosswindKt: r.crosswindKt,
                        headwindKt: r.headwindKt,
                        isSafe: r.isSafe,
                    })),
                },
            },
        });
    }

    async fetchMeteoStatus(flightData: {
        airportIcao: string;
        time: Date;
    }): Promise<IMeteoData | null> {
        const fetch = async (
            targetTime: Date,
        ): Promise<IAirportWeatherResponse> => {
            const formattedTime = targetTime
                .toISOString()
                .replace(/\.\d{3}/, '');

            const { data } = await axios.get<IAirportWeatherResponse>(
                `${this.configService.getOrThrow('METAR_URL')}/metar`,
                {
                    params: {
                        api_key: this.configService.getOrThrow('METAR_API_KEY'),
                        id: flightData.airportIcao,
                        time: formattedTime,
                    },
                },
            );
            return data;
        };

        try {
            let response = await fetch(flightData.time);

            if (response?.status == false) {
                const hourEarlier = new Date(
                    flightData.time.getTime() - 60 * 60 * 1000,
                );

                response = await fetch(hourEarlier);
            }

            if (!response || !response.status) {
                return null;
            }

            return this.mapToMeteoData(response);
        } catch (error) {
            console.error('Failed to fetch airport status', error);
            return null;
        }
    }

    private mapToMeteoData(apiData: IAirportWeatherResponse): IMeteoData {
        const { metar, runways } = apiData;

        const runwayStatuses: IRunwayStatus[] = runways?.map((r) => ({
            id: `${r.id_l}/${r.id_h}`,
            crosswindKt: Math.abs(r.xwnd),
            headwindKt: r.hwnd,
            isSafe: Math.abs(r.xwnd) <= 15,
        }));

        const reason = this.determineReason(apiData);

        const decision: IDecisionStatus = {
            takeoffOk: reason === null,
            landingOk: reason === null,
            reason: reason,
        };

        return {
            observedTimeUtc: new Date(metar.observed * 1000).toISOString(),
            visibilityM: metar.visibility,
            windDir: metar.wind_dir,
            windSpeedKt: metar.wind_speed,
            windGustKt: metar.wind_gust,
            ceilingFt: metar.ceiling,
            runways: runwayStatuses,
            isSnoclo: metar.snoclo,
            hasWindshear: metar.ws_all !== null || metar.ws_runways !== null,
            rawMetarText: metar.raw,
            decision: decision,
        };
    }

    private determineReason(
        data: IAirportWeatherResponse,
    ): MeteoStatusReason | null {
        const { metar, runways } = data;

        if (metar.snoclo) return MeteoStatusReason.SNOCLO;
        if (metar.ws_all !== null || metar.ws_runways !== null)
            return MeteoStatusReason.WINDSHEAR;

        if (metar.ceiling !== null && metar.ceiling < 200)
            return MeteoStatusReason.CEILING_LOW;

        const allRunwaysDangerous = runways.every((r) => Math.abs(r.xwnd) > 20);
        if (allRunwaysDangerous) return MeteoStatusReason.CROSSWIND_HIGH;

        if (metar.visibility < 550) return MeteoStatusReason.RVR_LOW;

        return null;
    }
}
