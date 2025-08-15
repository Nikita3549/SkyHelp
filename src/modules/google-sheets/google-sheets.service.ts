import { Injectable, OnModuleInit } from '@nestjs/common';
import { sheets_v4, google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { JWT } from 'google-auth-library';
import { isProd } from '../../utils/isProd';

@Injectable()
export class GoogleSheetsService implements OnModuleInit {
    private sheetsClient: sheets_v4.Sheets;
    private readonly GOOGLE_SHEETS_PRIVATE_KEY: string;
    private readonly GOOGLE_SHEETS_CLIENT_EMAIL: string;
    private readonly GOOGLE_SHEETS_UTM_LEADS_SPREAD_SHEET: string;
    private readonly GOOGLE_SHEETS_UTM_LEADS_SHEET_NAME: string;

    constructor(private readonly configService: ConfigService) {
        this.GOOGLE_SHEETS_PRIVATE_KEY = this.configService.getOrThrow(
            'GOOGLE_SHEETS_PRIVATE_KEY',
        );

        this.GOOGLE_SHEETS_CLIENT_EMAIL = this.configService.getOrThrow(
            'GOOGLE_SHEETS_CLIENT_EMAIL',
        );

        this.GOOGLE_SHEETS_UTM_LEADS_SPREAD_SHEET =
            this.configService.getOrThrow(
                'GOOGLE_SHEETS_UTM_LEADS_SPREAD_SHEET',
            );

        this.GOOGLE_SHEETS_UTM_LEADS_SHEET_NAME = this.configService.getOrThrow(
            'GOOGLE_SHEETS_UTM_LEADS_SHEET_NAME',
        );
    }

    async onModuleInit() {
        if (!isProd()) return;

        const authClient = new JWT({
            key: this.GOOGLE_SHEETS_PRIVATE_KEY.replace(/\\n/g, '\n'),
            email: this.GOOGLE_SHEETS_CLIENT_EMAIL,
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });

        this.sheetsClient = google.sheets({ version: 'v4', auth: authClient });
    }

    async upsertDailyUtmStats(
        date: string,
        stats: Record<string, number>,
        spreadSheetId: string = this.GOOGLE_SHEETS_UTM_LEADS_SPREAD_SHEET,
        sheetName: string = this.GOOGLE_SHEETS_UTM_LEADS_SHEET_NAME,
    ) {
        const range = `${sheetName}`;
        const getRes = await this.sheetsClient.spreadsheets.values.get({
            spreadsheetId: spreadSheetId,
            range,
        });

        const rows = getRes.data.values || [];
        const headers = rows[0] || ['Date'];

        const statKeys = Object.keys(stats);
        let headersChanged = false;
        for (const key of statKeys) {
            if (!headers.includes(key)) {
                headers.push(key);
                headersChanged = true;
            }
        }

        const row: string[] = new Array(headers.length).fill('');
        row[0] = date;
        for (const [key, value] of Object.entries(stats)) {
            const index = headers.indexOf(key);
            row[index] = value.toString();
        }

        for (let i = 1; i < row.length; i++) {
            if (row[i] === '' || row[i] === undefined || row[i] === null) {
                row[i] = '0';
            }
        }

        const existingRowIndex = rows.findIndex(
            (r, i) => i !== 0 && r[0] === date,
        );

        if (headersChanged) {
            await this.sheetsClient.spreadsheets.values.update({
                spreadsheetId: spreadSheetId,
                range: `${sheetName}!A1`,
                valueInputOption: 'RAW',
                requestBody: { values: [headers] },
            });
        }

        if (existingRowIndex !== -1) {
            const targetRange = `${sheetName}!A${existingRowIndex + 1}`;
            await this.sheetsClient.spreadsheets.values.update({
                spreadsheetId: spreadSheetId,
                range: targetRange,
                valueInputOption: 'RAW',
                requestBody: { values: [row] },
            });
        } else {
            await this.sheetsClient.spreadsheets.batchUpdate({
                spreadsheetId: spreadSheetId,
                requestBody: {
                    requests: [
                        {
                            insertDimension: {
                                range: {
                                    sheetId: await this.getSheetId(
                                        spreadSheetId,
                                        sheetName,
                                    ),
                                    dimension: 'ROWS',
                                    startIndex: 1,
                                    endIndex: 2,
                                },
                                inheritFromBefore: false,
                            },
                        },
                    ],
                },
            });

            await this.sheetsClient.spreadsheets.values.update({
                spreadsheetId: spreadSheetId,
                range: `${sheetName}!A2`,
                valueInputOption: 'RAW',
                requestBody: { values: [row] },
            });
        }

        const sheetId = await this.getSheetId(spreadSheetId, sheetName);

        if (sheetId == null) {
            console.error(
                '[Google Sheets] Invalid sheet id. Probably someone rename sheet...',
            );
            return;
        }

        await this.autoResizeColumns(spreadSheetId, sheetId);
    }

    private async autoResizeColumns(spreadsheetId: string, sheetId: number) {
        await this.sheetsClient.spreadsheets.batchUpdate({
            spreadsheetId,
            requestBody: {
                requests: [
                    {
                        autoResizeDimensions: {
                            dimensions: {
                                sheetId,
                                dimension: 'COLUMNS',
                                startIndex: 0,
                                endIndex: 200,
                            },
                        },
                    },
                ],
            },
        });
    }

    private async getSheetId(spreadSheetId: string, sheetTitle: string) {
        const { data } = await this.sheetsClient.spreadsheets.get({
            spreadsheetId: spreadSheetId,
        });
        const sheet = data.sheets?.find(
            (s) => s.properties?.title == sheetTitle,
        );
        return sheet?.properties?.sheetId;
    }
}
