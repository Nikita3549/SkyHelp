import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import axios, { AxiosResponse } from 'axios';
import * as jwt from 'jsonwebtoken';

@Injectable()
export class DocusignService {
    private _accessToken: string;
    DOCUSIGN_PRIVATE_KEY: string = '';
    DOCUSIGN_INTEGRATION_KEY: string = '';
    DOCUSIGN_USER_ID: string = '';
    DOCUSIGN_AUTH_SERVER: string;
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
        this.DOCUSIGN_USER_ID = configService.getOrThrow('DOCUSIGN_USER_ID');

        // this.exchangeToken();
    }

    async exchangeToken() {
        const jwtPayload = {
            iss: this.DOCUSIGN_INTEGRATION_KEY,
            sub: this.DOCUSIGN_USER_ID,
            aud: this.DOCUSIGN_AUTH_SERVER,
            scope: 'signature impersonation',
        };

        const token = jwt.sign(jwtPayload, this.DOCUSIGN_PRIVATE_KEY, {
            algorithm: 'RS256',
            expiresIn: '10m',
        });

        const response: AxiosResponse<{ access_token: string }> =
            await axios.post(
                `https://${this.DOCUSIGN_AUTH_SERVER}/oauth/token`,
                new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: token,
                }),
                {
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                    },
                },
            );

        this.accessToken = response.data.access_token;
    }

    // @Cron(CronExpression.EVERY_30_MINUTES)
    // handleCron() {
    //     this.exchangeToken();
    // }

    get accessToken(): string {
        return this._accessToken;
    }

    private set accessToken(value: string) {
        this._accessToken = value;
    }
}
