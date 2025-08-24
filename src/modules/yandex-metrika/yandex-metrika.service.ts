import { Injectable, OnModuleInit } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import * as console from 'node:console';
import { Cron } from '@nestjs/schedule';
import {
    EVERY_DAY_AT_FOUR_AM,
    EVERY_MONTH_AT_THREE_AM,
    GOOGLE_SHEETS_INSTAGRAM_SHEET_NAME,
    GOOGLE_SHEETS_TARGET_SHEET_NAME,
    GOOGLE_SHEETS_TIKTOK_SHEET_NAME,
    UTM_SOURCE_INSTAGRAM,
    UTM_SOURCE_TIKTOK,
} from './constants';
import { GoogleSheetsService } from '../google-sheets/google-sheets.service';
import { YandexMetrikaRow } from './interfaces/yandex-metrika-row';
import { getYesterdayDate } from '../../utils/getYesterdayDate';
import { isProd } from '../../utils/isProd';

@Injectable()
export class YandexMetrikaService implements OnModuleInit {
    private readonly REFRESH_TOKEN: string;
    private readonly CLIENT_ID: string;
    private readonly CLIENT_SECRET: string;
    private readonly COUNTER_ID: number;
    private readonly GOAL_ID: number;
    private _accessToken: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly googleSheetService: GoogleSheetsService,
    ) {
        this.CLIENT_SECRET = this.configService.getOrThrow(
            'YANDEX_METRIKA_CLIENT_SECRET',
        );

        this.CLIENT_ID = this.configService.getOrThrow(
            'YANDEX_METRIKA_CLIENT_ID',
        );

        this.REFRESH_TOKEN = this.configService.getOrThrow(
            'YANDEX_METRIKA_REFRESH_TOKEN',
        );

        this.COUNTER_ID = this.configService.getOrThrow<number>(
            'YANDEX_METRIKA_COUNTER_ID',
        );

        this.GOAL_ID = this.configService.getOrThrow<number>(
            'YANDEX_METRIKA_GOAL_ID',
        );
    }

    async onModuleInit() {
        if (!isProd()) return;

        await this.refreshAccessToken();
    }

    @Cron(EVERY_DAY_AT_FOUR_AM)
    async sendReportInSheet() {
        if (!isProd()) return;

        const conversions = await this.fetchGoalConversionsWithUTM();

        const targetConversions = conversions.filter(
            (c) =>
                c.utmSource != UTM_SOURCE_TIKTOK &&
                c.utmSource != UTM_SOURCE_INSTAGRAM,
        );
        const tiktokConversions = conversions.filter(
            (c) => c.utmSource == UTM_SOURCE_TIKTOK,
        );
        const instagramConversions = conversions.filter(
            (c) => c.utmSource == UTM_SOURCE_INSTAGRAM,
        );

        const targetStats = this.createStats(targetConversions);
        const tiktokStats = this.createStats(tiktokConversions);
        const instagramStats = this.createStats(instagramConversions);

        await this.googleSheetService.upsertDailyUtmStats(
            getYesterdayDate('dd-mm-yyyy'),
            targetStats,
            GOOGLE_SHEETS_TARGET_SHEET_NAME,
        );

        await this.googleSheetService.upsertDailyUtmStats(
            getYesterdayDate('dd-mm-yyyy'),
            tiktokStats,
            GOOGLE_SHEETS_TIKTOK_SHEET_NAME,
        );

        await this.googleSheetService.upsertDailyUtmStats(
            getYesterdayDate('dd-mm-yyyy'),
            instagramStats,
            GOOGLE_SHEETS_INSTAGRAM_SHEET_NAME,
        );
    }

    private async fetchGoalConversionsWithUTM(): Promise<YandexMetrikaRow[]> {
        const response = await axios.get(
            'https://api-metrika.yandex.net/stat/v1/data',
            {
                headers: {
                    Authorization: `OAuth ${this.accessToken}`,
                },
                params: {
                    ids: this.COUNTER_ID,
                    metrics: `ym:s:goal${this.GOAL_ID}reaches`,
                    dimensions: [
                        'ym:s:clientID',
                        'ym:s:lastUTMSource',
                        'ym:s:lastUTMMedium',
                        'ym:s:lastUTMCampaign',
                    ].join(','),
                    filters: `ym:s:goal${this.GOAL_ID}reaches>0`,
                    date1: getYesterdayDate('yyyy-mm-dd'),
                    date2: getYesterdayDate('yyyy-mm-dd'),
                    accuracy: 'full',
                    limit: 100000,
                },
            },
        );

        return response.data.data
            .map((row: any) => ({
                clientId: row.dimensions[0].name,
                utmSource: row.dimensions[1].name,
                utmMedium: row.dimensions[2].name,
                utmCampaign: row.dimensions[3].name,
                goalReaches: row.metrics[0],
            }))
            .filter(
                (row: YandexMetrikaRow) =>
                    !!row.utmSource &&
                    !row.utmSource.includes('{{adset.name}}'),
            );
    }

    private createStats(conversions: YandexMetrikaRow[]) {
        const stats: Record<string, number> = {};

        for (const row of conversions) {
            stats[`${row.utmSource}, ${row.utmCampaign}, ${row.utmMedium}`] =
                +row.goalReaches;
        }

        return stats;
    }

    @Cron(EVERY_MONTH_AT_THREE_AM)
    async refreshAccessToken() {
        try {
            console.log('[Yandex Metrika] Requesting access token...');

            const res = await axios.post(
                'https://oauth.yandex.ru/token',
                {
                    grant_type: 'refresh_token',
                    refresh_token: this.REFRESH_TOKEN,
                    client_id: this.CLIENT_ID,
                    client_secret: this.CLIENT_SECRET,
                },
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

            console.log('[Yandex Metrika] Access token refreshed');

            this.accessToken = res.data.access_token;
        } catch (e: unknown) {
            console.error('[Yandex Metrika] Failed to refresh access token');
        }
    }

    get accessToken(): string {
        return this._accessToken;
    }

    set accessToken(value: string) {
        this._accessToken = value;
    }
}
