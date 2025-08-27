import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { FIFTY_FIVE_MINUTES } from '../../constants';
import { GmailService } from '../../gmail.service';
import { EmailCategory } from '../../enums/email-type.enum';
import Gmail = gmail_v1.Gmail;

@Injectable()
export class GmailNoreplyAccountService implements OnModuleInit {
    private oauth2Client: OAuth2Client;
    private gmail: Gmail;
    private _accessToken: string;

    constructor(
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => GmailService))
        private readonly gmailService: GmailService,
    ) {}

    async onModuleInit() {
        this.oauth2Client = new google.auth.OAuth2(
            this.configService.getOrThrow('GMAIL_NOREPLY_CLIENT_ID'),
            this.configService.getOrThrow('GMAIL_NOREPLY_CLIENT_SECRET'),
            this.configService.getOrThrow('GMAIL_NOREPLY_REDIRECT_URI'),
        );

        this.oauth2Client.setCredentials({
            refresh_token: this.configService.getOrThrow(
                'GMAIL_NOREPLY_REFRESH_TOKEN',
            ),
        });

        await this.refreshAccessToken();

        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
    }

    async sendEmailHtml(
        to: string,
        subject: string,
        htmlContent: string,
        emailCategory: EmailCategory = EmailCategory.TRANSACTIONAL,
    ) {
        await this.gmailService.sendEmailHtml(
            to,
            subject,
            htmlContent,
            this.configService.getOrThrow('GMAIL_NOREPLY_SENDER_NAME'),
            this.gmail,
            emailCategory,
        );
    }
    async sendEmail(
        to: string,
        subject: string,
        content: string,
        emailCategory: EmailCategory = EmailCategory.TRANSACTIONAL,
    ) {
        await this.gmailService.sendEmail(
            to,
            subject,
            content,
            this.configService.getOrThrow('GMAIL_NOREPLY_SENDER_NAME'),
            this.gmail,
            emailCategory,
        );
    }

    @Interval(FIFTY_FIVE_MINUTES)
    async refreshAccessToken() {
        try {
            const tokens = await this.oauth2Client.refreshAccessToken();
            const accessToken = tokens.credentials.access_token;

            if (!accessToken) throw new Error();

            this.accessToken = accessToken;
            console.log('[Gmail Noreply] Access token refreshed');
        } catch (err) {
            console.error(
                '[Gmail Noreply] Failed to refresh access token',
                err,
            );
        }
    }

    private get accessToken() {
        return this._accessToken;
    }
    private set accessToken(accessToken: string) {
        this._accessToken = accessToken;
    }
}
