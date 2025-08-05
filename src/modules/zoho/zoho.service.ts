import {
    HttpStatus,
    Injectable,
    InternalServerErrorException,
    OnModuleInit,
} from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { FIFTY_MINUTES, REFRESH_ACCESS_TOKEN_ATTEMPTS } from './constants';
import axios, { AxiosError } from 'axios';
import { ConfigService } from '@nestjs/config';
import { sleep } from '../../utils/sleep';
import { formatDate } from '../../utils/formatDate';
import { SignScenarioType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import * as path from 'path';
import * as fs from 'fs/promises';
import { IAssignmentData } from './interfaces/assignment-data.interface';

@Injectable()
export class ZohoService implements OnModuleInit {
    private readonly REFRESH_TOKEN: string;
    private readonly CLIENT_ID: string;
    private readonly CLIENT_SECRET: string;
    private readonly ASSIGNMENT_AGREEMENT_TEMPLATE_ID: string;
    private readonly ZOHO_AUTH_BASE_URL: string;
    private readonly ZOHO_BASE_URL: string;
    private readonly ZOHO_ACTION_ID: string;
    private readonly ZOHO_CLIENT_ROLE: string;
    private _accessToken: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {
        this.REFRESH_TOKEN =
            this.configService.getOrThrow('ZOHO_REFRESH_TOKEN');

        this.CLIENT_ID = this.configService.getOrThrow('ZOHO_CLIENT_ID');

        this.CLIENT_SECRET = this.configService.getOrThrow('ZOHO_SECRET_ID');

        this.ASSIGNMENT_AGREEMENT_TEMPLATE_ID = this.configService.getOrThrow(
            'ZOHO_ASSIGNMENT_AGREEMENT_TEMPLATE_ID',
        );

        this.ZOHO_AUTH_BASE_URL =
            this.configService.getOrThrow('ZOHO_AUTH_BASE_URL');

        this.ZOHO_BASE_URL = this.configService.getOrThrow('ZOHO_BASE_URL');

        this.ZOHO_ACTION_ID = this.configService.getOrThrow('ZOHO_ACTION_ID');

        this.ZOHO_CLIENT_ROLE =
            this.configService.getOrThrow('ZOHO_CLIENT_ROLE');
    }

    async onModuleInit() {
        await this.refreshAccessToken();
    }

    @Interval(FIFTY_MINUTES)
    private async handleTokenRefresh() {
        await this.refreshAccessToken();
    }

    private async refreshAccessToken() {
        for (let i = 0; i < REFRESH_ACCESS_TOKEN_ATTEMPTS; i++) {
            try {
                console.log('[Zoho] Requesting access token...');
                const res = await axios.post(
                    `${this.ZOHO_AUTH_BASE_URL}/oauth/v2/token`,
                    null,
                    {
                        params: {
                            refresh_token: this.REFRESH_TOKEN,
                            client_id: this.CLIENT_ID,
                            client_secret: this.CLIENT_SECRET,
                            grant_type: 'refresh_token',
                        },
                    },
                );

                this.accessToken = res.data.access_token;
                console.log('[Zoho] Access token refreshed');
                return;
            } catch (e) {
                if (e instanceof AxiosError) {
                    const status = e.response?.status;
                    const description = e.response?.data.description || '';

                    console.error(`[Zoho] Error: ${status} - ${description}`);

                    if (
                        status == HttpStatus.BAD_REQUEST &&
                        description.includes('too many requests')
                    ) {
                        const delay = (i + 1) * 2000;
                        console.warn(
                            `[Zoho] Rate limit hit. Waiting ${delay}ms...`,
                        );
                        await sleep(delay);
                        continue;
                    }

                    if (i == REFRESH_ACCESS_TOKEN_ATTEMPTS - 1) {
                        console.error(
                            `[Zoho] Failed to refresh access token, stop retrying:`,
                            e.message,
                        );
                        throw e;
                    }

                    console.warn(
                        `[Zoho] Retry ${i + 1} after error:`,
                        e.message,
                    );
                    await sleep(1000);
                } else {
                    console.error(
                        '[Zoho] Unknown error while refreshing access token:',
                        e,
                    );
                    return;
                }
            }
        }
    }

    private async getAccessToken() {
        let accessToken = this.accessToken;

        if (!accessToken) {
            await this.refreshAccessToken();

            accessToken = this.accessToken;
        }

        return accessToken;
    }

    async generateSignLink(
        assignmentData: IAssignmentData,
        scenario: SignScenarioType,
    ) {
        const createRes = await axios.post(
            `${this.ZOHO_BASE_URL}/api/v1/templates/${this.ASSIGNMENT_AGREEMENT_TEMPLATE_ID}/createdocument?is_quicksend=true`,
            {
                templates: {
                    field_data: {
                        field_text_data: {
                            airline: assignmentData.airlineName,
                            assignment_date: formatDate(assignmentData.date),
                            claim_id: assignmentData.claimId,
                            client_address: assignmentData.address,
                            client_fullname: `${assignmentData.firstName} ${assignmentData.lastName}`,
                            flight_date: formatDate(assignmentData.date),
                            flight_number: assignmentData.flightNumber,
                            sign_client_fullname: `${assignmentData.firstName} ${assignmentData.lastName}`,
                        },
                    },
                    actions: [
                        {
                            action_id: this.ZOHO_ACTION_ID,
                            is_embedded: true,
                            recipient_name: `${assignmentData.firstName} ${assignmentData.lastName}`,
                            recipient_email: assignmentData.recipientEmail,
                            action_type: 'SIGN',
                            role: this.ZOHO_CLIENT_ROLE,
                            verify_recipient: false,
                        },
                    ],
                    notes: '',
                },
            },
            {
                headers: {
                    Authorization: `Zoho-oauthtoken ${await this.getAccessToken()}`,
                    'Content-Type': 'application/json',
                },
            },
        );

        const req = createRes.data.requests;
        const requestId = req.request_id;
        const actionId = req.actions[0].action_id;

        await this.prisma.signScenario.create({
            data: {
                requestId,
                scenario,
                claimId: assignmentData.claimId,
            },
        });

        const embedRes = await axios.post(
            `${this.ZOHO_BASE_URL}/api/v1/requests/${requestId}/actions/${actionId}/embedtoken`,
            null,
            {
                params: {
                    host: this.configService.getOrThrow('FRONTEND_HOST'),
                },
                headers: {
                    Authorization: `Zoho-oauthtoken ${await this.getAccessToken()}`,
                },
            },
        );

        const signUrl = embedRes.data.sign_url;
        return signUrl;
    }

    private get accessToken(): string {
        return this._accessToken;
    }

    private set accessToken(value: string) {
        this._accessToken = value;
    }

    async getScenario(requestId: string) {
        return this.prisma.signScenario.findFirst({
            where: {
                requestId,
            },
        });
    }

    async saveDocumentById(
        requestId: string,
        documentId: string,
    ): Promise<{ path: string }> {
        const res = await axios
            .get(
                `${this.ZOHO_BASE_URL}/api/v1/requests/${requestId}/documents/${documentId}/pdf`,
                {
                    responseType: 'arraybuffer',
                    headers: {
                        Authorization: `Zoho-oauthtoken ${await this.getAccessToken()}`,
                    },
                },
            )
            .catch((e: unknown) => {
                if (e instanceof AxiosError) {
                    throw new Error(
                        `Internal server error: ${JSON.stringify(e.response!.data)}`,
                    );
                }
                throw e;
            });

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}.pdf`;
        const uploadDir = path.join(__dirname, '../../../uploads');
        const filePath = path.join(uploadDir, fileName);

        await fs.writeFile(filePath, res.data);

        return {
            path: filePath,
        };
    }
}
