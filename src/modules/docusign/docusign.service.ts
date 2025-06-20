import { Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosError, AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';
import { IUserInfoResponse } from './interfaces/user-info.response';
import { ICreateEnvelopeRequest } from './interfaces/create-envelope.request';
import { ICreateEnvelopeResponse } from './interfaces/create-envelope.response';
import { IGetSignUrlRequest } from './interfaces/get-sign-url.request';
import { IGetSignUrlResponse } from './interfaces/get-sign-url.response';
import { ICreateEnvelopeParams } from './interfaces/create-envelope.params';
import {
    DEFAULT_AUTHENTICATION_METHOD,
    DEFAULT_ENVELOPE_STATUS,
    DEFAULT_TOKEN_JWT_PAYLOAD,
} from './constants';
import * as fs from 'node:fs';
import * as path from 'path';

@Injectable()
export class DocusignService implements OnModuleInit {
    private _accessToken: string;
    private _accountId: string;
    private _baseUri: string;
    private _defaultRestApiUrl: string;
    private readonly DOCUSIGN_PRIVATE_KEY: string = '';
    private readonly DOCUSIGN_INTEGRATION_KEY: string = '';
    private readonly DOCUSIGN_TEMPLATE_DEFAULT_CLIENT_ROLE: string = '';
    private readonly DOCUSIGN_USER_ID: string = '';
    private readonly DOCUSIGN_AUTH_SERVER: string = '';
    private readonly DOCUSIGN_TEMPLATE_ID: string = '';
    private readonly DOCUSIGN_RETURN_URL: string = '';
    private readonly DOCUSIGN_DEFAULT_RECIPIENT_ID: string = '';
    constructor(private readonly configService: ConfigService) {
        this.DOCUSIGN_PRIVATE_KEY = configService.getOrThrow(
            'DOCUSIGN_PRIVATE_KEY',
        );
        this.DOCUSIGN_INTEGRATION_KEY = configService.getOrThrow(
            'DOCUSIGN_INTEGRATION_KEY',
        );
        this.DOCUSIGN_AUTH_SERVER = configService.getOrThrow(
            'DOCUSIGN_AUTH_SERVER',
        );

        this.DOCUSIGN_TEMPLATE_ID = configService.getOrThrow(
            'DOCUSIGN_TEMPLATE_ID',
        );

        this.DOCUSIGN_RETURN_URL = configService.getOrThrow(
            'DOCUSIGN_RETURN_URL',
        );

        this.DOCUSIGN_TEMPLATE_DEFAULT_CLIENT_ROLE = configService.getOrThrow(
            'DOCUSIGN_TEMPLATE_DEFAULT_CLIENT_ROLE',
        );

        this.DOCUSIGN_DEFAULT_RECIPIENT_ID = configService
            .getOrThrow<number>('DOCUSIGN_DEFAULT_RECIPIENT_ID')
            .toString();

        this.DOCUSIGN_USER_ID = configService.getOrThrow('DOCUSIGN_USER_ID');
    }

    async onModuleInit() {
        await this.handleCron();

        await this.getUserInfo();

        this.defaultRestApiUrl = `${this.baseUri}/restapi/v2.1/accounts/${this.accountId}`;
    }

    private async exchangeToken() {
        const jwtPayload = {
            iss: this.DOCUSIGN_INTEGRATION_KEY,
            sub: this.DOCUSIGN_USER_ID,
            aud: this.DOCUSIGN_AUTH_SERVER,
            scope: DEFAULT_TOKEN_JWT_PAYLOAD,
        };

        const token = jwt.sign(jwtPayload, this.DOCUSIGN_PRIVATE_KEY, {
            algorithm: 'RS256',
            expiresIn: '10m',
        });
        const response: AxiosResponse<{ access_token: string }> = await axios
            .post(
                `https://${this.DOCUSIGN_AUTH_SERVER}/oauth/token`,
                new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: token,
                    scope: 'signature impersonation',
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            )
            .catch(this.handleAxiosError);

        this.accessToken = response.data.access_token;
    }

    private async getUserInfo() {
        const response: AxiosResponse<IUserInfoResponse> = await axios
            .get(`https://${this.DOCUSIGN_AUTH_SERVER}/oauth/userinfo`, {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
            })
            .catch(this.handleAxiosError);

        const defaultAccount = response.data.accounts.find(
            (acc) => acc.is_default,
        );

        if (!defaultAccount) {
            throw new Error(
                `DocuSign Error: oauth get user info didn't return default account \n ${response.data}`,
            );
        }

        this.accountId = defaultAccount.account_id;

        this.baseUri = defaultAccount.base_uri;
    }

    @Cron(CronExpression.EVERY_30_MINUTES)
    async handleCron() {
        await this.exchangeToken();
    }

    async createEnvelope(
        params: ICreateEnvelopeParams,
    ): Promise<ICreateEnvelopeResponse> {
        const createEnvelopeRes: AxiosResponse<ICreateEnvelopeResponse> =
            await axios
                .post(
                    `${this.defaultRestApiUrl}/envelopes`,
                    this.getCreateEnvelopeBody(params),
                    {
                        headers: {
                            Authorization: `Bearer ${this.accessToken}`,
                        },
                    },
                )
                .catch(this.handleAxiosError);

        return createEnvelopeRes.data;
    }

    async getSignUrl(params: IGetSignUrlParams): Promise<IGetSignUrlResponse> {
        const { envelopeId, claimId, customerName, customerEmail } = params;
        const getSignUrlBody: IGetSignUrlRequest = {
            authenticationMethod: DEFAULT_AUTHENTICATION_METHOD,
            email: customerEmail,
            userName: customerName,
            returnUrl: this.DOCUSIGN_RETURN_URL,
            recipientId: this.DOCUSIGN_DEFAULT_RECIPIENT_ID,
            clientUserId: claimId,
        };

        const getSignUrlRes: AxiosResponse<IGetSignUrlResponse> = await axios
            .post(
                `${this.defaultRestApiUrl}/envelopes/${envelopeId}/views/recipient`,
                getSignUrlBody,
                {
                    headers: {
                        Authorization: `Bearer ${this.accessToken}`,
                    },
                },
            )
            .catch(this.handleAxiosError);

        return getSignUrlRes.data;
    }

    private getCreateEnvelopeBody(
        params: ICreateEnvelopeParams,
    ): ICreateEnvelopeRequest {
        const { customerEmail, customerName, claimId, labels } = params;
        return {
            templateId: this.DOCUSIGN_TEMPLATE_ID,
            status: DEFAULT_ENVELOPE_STATUS,
            templateRoles: [
                {
                    roleName: this.DOCUSIGN_TEMPLATE_DEFAULT_CLIENT_ROLE,
                    name: customerName,
                    email: customerEmail,
                    clientUserId: claimId,
                    tabs: {
                        textTabs: [
                            {
                                tabLabel: 'assignment_date',
                                value: labels.assignmentDate,
                            },
                            {
                                tabLabel: 'title_client_name',
                                value: customerName,
                            },
                            {
                                tabLabel: 'client_address',
                                value: labels.clientAddress,
                            },
                            {
                                tabLabel: 'claim_id',
                                value: claimId,
                            },
                            {
                                tabLabel: 'flight_airline',
                                value: labels.flightAirline,
                            },
                            {
                                tabLabel: 'flight_number',
                                value: labels.flightNumber,
                            },
                            {
                                tabLabel: 'flight_date',
                                value: labels.flightDate,
                            },
                            {
                                tabLabel: 'client_name',
                                value: customerName,
                            },
                        ],
                    },
                },
            ],
        };
    }

    async getAndSaveDocument(
        envelopeId: string,
    ): Promise<{ filePath: string }> {
        const response: AxiosResponse<Buffer> = await axios.get(
            `${this.defaultRestApiUrl}/envelopes/${envelopeId}/documents/combined`,
            {
                headers: {
                    Authorization: `Bearer ${this.accessToken}`,
                },
                responseType: 'arraybuffer',
            },
        );

        const filePath = path.join(
            __dirname,
            `../../../uploads/${envelopeId}.pdf`,
        );

        fs.writeFileSync(filePath, response.data);

        return {
            filePath,
        };
    }

    private handleAxiosError(e: unknown): never {
        if (e instanceof AxiosError) {
            new Error(`DocuSign Error: ${e.response?.data || e.message}`);
        }
        throw e;
    }

    get accessToken(): string {
        return this._accessToken;
    }

    private set accessToken(value: string) {
        this._accessToken = value;
    }

    private get accountId(): string {
        return this._accountId;
    }

    private set accountId(value: string) {
        this._accountId = value;
    }

    private get baseUri(): string {
        return this._baseUri;
    }

    private set baseUri(value: string) {
        this._baseUri = value;
    }

    get defaultRestApiUrl(): string {
        return this._defaultRestApiUrl;
    }

    set defaultRestApiUrl(value: string) {
        this._defaultRestApiUrl = value;
    }
}
