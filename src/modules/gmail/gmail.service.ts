import { Injectable, OnModuleInit } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import {
    DEFAULT_GET_PAGE_ALIAS,
    DEFAULT_GET_PAGE_SIZE,
    FIFTY_FIVE_MINUTES,
    LABEL_ID_INBOX,
    NEGATIVE_PAGE_ERROR,
    UPDATE_ACCESS_TOKEN_ERROR,
    USER_ID_ME,
} from './constants';
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

        await this.updateAccessToken();

        this.gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });

        // console.log(await this.getGmailPage());
    }

    async getGmailPage(
        page: number = 0,
        alias: string = DEFAULT_GET_PAGE_ALIAS,
        pageSize = DEFAULT_GET_PAGE_SIZE,
    ) {
        if (page < 0) throw new Error(NEGATIVE_PAGE_ERROR);
        page = page + 1;

        let nextPageToken: string | undefined;
        let currentPage = 1;

        while (true) {
            const res = await this.gmail.users.messages.list({
                userId: USER_ID_ME,
                q: `to:${alias}`,
                labelIds: [LABEL_ID_INBOX],
                maxResults: pageSize,
                pageToken: nextPageToken,
            });

            if (currentPage == page) {
                const messages = res.data.messages ?? [];

                return await Promise.all(
                    messages.map(async (message) => {
                        if (!message.id) return;

                        const fullMessage = await this.gmail.users.messages.get(
                            {
                                userId: USER_ID_ME,
                                id: message.id,
                            },
                        );

                        const payload = fullMessage.data.payload;
                        if (!payload) {
                            return;
                        }
                        const headers = payload?.headers || [];

                        const subject = headers.find(
                            (h) => h.name === 'Subject',
                        )?.value;
                        const from = headers.find(
                            (h) => h.name === 'From',
                        )?.value;
                        const to = headers.find((h) => h.name === 'To')?.value;

                        const body = this.extractBodyFromPayload(payload);
                        const attachments = await this.extractAttachments(
                            message.id,
                            payload,
                        );

                        return {
                            id: fullMessage.data.id,
                            subject,
                            from,
                            to,
                            snippet: fullMessage.data.snippet,
                            body,
                            attachments,
                        };
                    }),
                );
            }

            nextPageToken = res.data.nextPageToken
                ? res.data.nextPageToken
                : undefined;
            if (!nextPageToken) break;

            currentPage++;
        }

        return [];
    }

    async sendEmailHtml(
        to: string,
        subject: string,
        htmlContent: string,
        from: string,
    ) {
        try {
            const boundary = '__BOUNDARY__';

            const rawMessage = Buffer.from(
                [
                    `From: ${from}`,
                    `To: ${to}`,
                    `Subject: ${subject}`,
                    'MIME-Version: 1.0',
                    `Content-Type: multipart/alternative; boundary="${boundary}"`,
                    '',
                    `--${boundary}`,
                    'Content-Type: text/html; charset="UTF-8"',
                    'Content-Transfer-Encoding: 7bit',
                    '',
                    htmlContent,
                    `--${boundary}--`,
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

    async sendEmail(
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
        try {
            const tokens = await this.oauth2Client.refreshAccessToken();
            const accessToken = tokens.credentials.access_token;

            if (!accessToken) throw new Error();

            this.accessToken = accessToken;
            console.log('Gmail Access token refreshed');
        } catch (err) {
            console.error('Failed to refresh access token', err);
        }
    }

    private async extractAttachments(
        messageId: string,
        payload: gmail_v1.Schema$MessagePart,
    ): Promise<{ filename: string; mimeType: string; data: Buffer }[]> {
        const results: { filename: string; mimeType: string; data: Buffer }[] =
            [];

        const traverseParts = async (parts?: gmail_v1.Schema$MessagePart[]) => {
            if (!parts) return;

            for (const part of parts) {
                if (part.filename && part.body?.attachmentId) {
                    const attachmentRes =
                        await this.gmail.users.messages.attachments.get({
                            userId: 'me',
                            messageId,
                            id: part.body.attachmentId,
                        });

                    const attachmentData = attachmentRes.data.data;
                    if (!attachmentData) continue;

                    const buffer = Buffer.from(attachmentData, 'base64');

                    results.push({
                        filename: part.filename,
                        mimeType: part.mimeType ?? 'application/octet-stream',
                        data: buffer,
                    });
                }

                if (part.parts?.length) {
                    await traverseParts(part.parts);
                }
            }
        };

        await traverseParts(payload.parts);

        return results;
    }

    private extractBodyFromPayload(
        payload: gmail_v1.Schema$MessagePart,
    ): string {
        if (!payload) return '';

        if (
            payload.mimeType === 'text/plain' ||
            payload.mimeType === 'text/html'
        ) {
            const data = payload.body?.data;
            if (data) {
                return Buffer.from(data, 'base64').toString('utf-8');
            }
        }

        const part = payload.parts?.find(
            (p) => p.mimeType === 'text/plain' || p.mimeType === 'text/html',
        );

        if (part?.body?.data) {
            return Buffer.from(part.body.data, 'base64').toString('utf-8');
        }

        return '';
    }

    private get accessToken() {
        return this._accessToken;
    }
    private set accessToken(accessToken: string) {
        this._accessToken = accessToken;
    }
}
