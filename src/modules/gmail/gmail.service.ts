import { Injectable, OnModuleInit } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { FIFTY_FIVE_MINUTES, UPDATE_ACCESS_TOKEN_ERROR } from './constants';
import Gmail = gmail_v1.Gmail;

@Injectable()
export class GmailService implements OnModuleInit {
    private oauth2Client: OAuth2Client;
    private _accessToken: string;
    private gmail: Gmail;

    constructor(private readonly configService: ConfigService) {}

    async onModuleInit() {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.getOrThrow('GMAIL_CLIENT_ID'),
            this.configService.getOrThrow('GMAIL_CLIENT_SECRET'),
            this.configService.getOrThrow('GMAIL_REDIRECT_URI'),
        );

        this.oauth2Client.setCredentials({
            refresh_token: this.configService.getOrThrow('GMAIL_REFRESH_TOKEN'),
        });

        // await this.updateAccessToken();
        // console.log();

        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    async sendNoReplyEmail(to: string, subject: string, content: string) {
        await this.sendEmail(
            to,
            subject,
            content,
            this.configService.getOrThrow('GMAIL_NOREPLY_EMAIL'),
        );
    }

    async sendContactEmail(to: string, subject: string, content: string) {
        await this.sendEmail(
            to,
            subject,
            content,
            this.configService.getOrThrow('GMAIL_CONTACT_EMAIL'),
        );
    }

    private async sendEmail(
        to: string,
        subject: string,
        content: string,
        from: string,
    ) {
        try {
            const rawMessage = Buffer.from(
                [
                    `From: ${from}`,
                    `To: ${to}`,
                    `Subject: ${subject}`,
                    '',
                    `${content}`,
                ].join('\n'),
            )
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const res = await this.gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage,
                },
            });
        } catch (error) {
            console.error(error);
        }
    }

    @Interval(FIFTY_FIVE_MINUTES)
    async updateAccessToken() {
        const { token } = await this.oauth2Client.getAccessToken();

        if (!token) {
            throw new Error(UPDATE_ACCESS_TOKEN_ERROR);
        }

        this.accessToken = token;
    }

    private get accessToken() {
        return this._accessToken;
    }
    private set accessToken(accessToken: string) {
        this.oauth2Client.setCredentials({ access_token: accessToken });
        this._accessToken = accessToken;
    }
}
