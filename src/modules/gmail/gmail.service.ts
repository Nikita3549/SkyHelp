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
    USER_ID_ME,
} from './constants';
import Gmail = gmail_v1.Gmail;
import { MessagePreview } from './interfaces/message-preview.interface';

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

    async getMessagesForAliasTeam(): Promise<MessagePreview[]> {
        const res = await this.gmail.users.messages.list({
            userId: 'me',
            auth: this.oauth2Client,
            q: 'to:team@skyhelp.md OR from:team@skyhelp.md',
            maxResults: 100,
        });

        if (!res.data.messages) return [];

        const messages = await Promise.all(
            res.data.messages.map((msg) =>
                this.gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id!,
                    format: 'metadata',
                    metadataHeaders: ['Subject', 'From', 'To', 'Date'],
                    auth: this.oauth2Client,
                }),
            ),
        );

        return messages.map(({ data }) => ({
            id: data.id!,
            threadId: data.threadId!,
            from: this.extractHeader(data.payload?.headers, 'From') || '',
            to:
                this.extractHeader(data.payload?.headers, 'To')
                    ?.split(',')
                    .map((e) => e.trim()) || [],
            subject: this.extractHeader(data.payload?.headers, 'Subject') || '',
            date: Number(data.internalDate),
            snippet: data.snippet || '',
            hasAttachments: this.hasAttachments(data),
        }));
    }

    async getMessagesWithUserForAliasTeam(
        email: string,
    ): Promise<MessagePreview[]> {
        const query = `(from:${email} OR to:${email}) (from:team@skyhelp.md OR to:team@skyhelp.md)`;

        const res = await this.gmail.users.messages.list({
            userId: 'me',
            auth: this.oauth2Client,
            q: query,
            maxResults: 100,
        });

        if (!res.data.messages) return [];

        const messages = await Promise.all(
            res.data.messages.map((msg) =>
                this.gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id!,
                    format: 'metadata',
                    metadataHeaders: ['Subject', 'From', 'To', 'Date'],
                    auth: this.oauth2Client,
                }),
            ),
        );

        return messages.map(({ data }) => ({
            id: data.id!,
            threadId: data.threadId!,
            from: this.extractHeader(data.payload?.headers, 'From') || '',
            to:
                this.extractHeader(data.payload?.headers, 'To')
                    ?.split(',')
                    .map((e) => e.trim()) || [],
            subject: this.extractHeader(data.payload?.headers, 'Subject') || '',
            date: Number(data.internalDate),
            snippet: data.snippet || '',
            hasAttachments: this.hasAttachments(data),
        }));
    }

    private extractHeader(
        headers: gmail_v1.Schema$MessagePartHeader[] = [],
        name: string,
    ): string | undefined | null {
        return headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())
            ?.value;
    }

    private hasAttachments(message: gmail_v1.Schema$Message): boolean {
        const parts = message.payload?.parts || [];
        return parts.some((p) => !!p.filename && !!p.body?.attachmentId);
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
