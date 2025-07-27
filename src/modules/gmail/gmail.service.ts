import { Injectable, OnModuleInit } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { ATTACHMENT_NOT_FOUND, FIFTY_FIVE_MINUTES } from './constants';
import Gmail = gmail_v1.Gmail;
import { GmailLetterSearchParams } from './interfaces/gmail-message-search-params.interface';
import { ILetter } from '../letter/interfaces/letter.interface';
import { IAttachment } from './interfaces/attachment.interface';
import { UnixTimeService } from '../unix-time/unix-time.service';
import { AttachmentNotFoundError } from './errors/attachment-not-found.error';

@Injectable()
export class GmailService implements OnModuleInit {
    private oauth2Client: OAuth2Client;
    private _accessToken: string;
    private gmail: Gmail;
    private readonly GMAIL_TEAM_EMAIL: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly unixTimeService: UnixTimeService,
    ) {
        this.GMAIL_TEAM_EMAIL =
            this.configService.getOrThrow('GMAIL_TEAM_EMAIL');
    }

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
    }

    async getAttachmentById(
        messageId: string,
        partId: string,
    ): Promise<{ filename: string; mimeType: string; data: Buffer }> {
        const message = await this.gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
            auth: this.oauth2Client,
        });

        const attachmentPart = this.findPartWithPartId(
            message.data.payload,
            partId,
        );
        if (!attachmentPart || !attachmentPart.body?.attachmentId) {
            throw new AttachmentNotFoundError(ATTACHMENT_NOT_FOUND);
        }

        const attachmentId = attachmentPart.body.attachmentId;

        const attachment = await this.gmail.users.messages.attachments.get({
            userId: 'me',
            messageId,
            id: attachmentId,
            auth: this.oauth2Client,
        });

        const buffer = Buffer.from(
            attachment.data.data!.replace(/-/g, '+').replace(/_/g, '/'),
            'base64',
        );
        return {
            filename: attachmentPart.filename ?? 'unnamed',
            mimeType: attachmentPart.mimeType ?? 'application/octet-stream',
            data: buffer,
        };
    }

    private findPartWithPartId(
        part: gmail_v1.Schema$MessagePart | undefined,
        partId: string,
    ): gmail_v1.Schema$MessagePart | null {
        if (!part) return null;

        if (part.partId === partId) return part;

        if (part.parts) {
            for (const p of part.parts) {
                const found = this.findPartWithPartId(p, partId);
                if (found) return found;
            }
        }

        return null;
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

    async sendEmailWithAttachments(
        to: string,
        subject: string,
        content: string,
        from: string,
        attachments: { filename: string; content: Buffer; mimeType: string }[],
    ) {
        const boundary = '__MAIL__BOUNDARY__';
        const newline = '\r\n';

        const mimeParts: string[] = [];

        mimeParts.push(`From: ${from}`);
        mimeParts.push(`To: ${to}`);
        mimeParts.push(`Subject: ${subject}`);
        mimeParts.push(`MIME-Version: 1.0`);
        mimeParts.push(`Content-Type: multipart/mixed; boundary="${boundary}"`);
        mimeParts.push('');

        mimeParts.push(`--${boundary}`);
        mimeParts.push(`Content-Type: text/plain; charset="UTF-8"`);
        mimeParts.push(`Content-Transfer-Encoding: 7bit`);
        mimeParts.push('');
        mimeParts.push(content);
        mimeParts.push('');

        for (const attachment of attachments) {
            const encodedContent = attachment.content.toString('base64');

            mimeParts.push(`--${boundary}`);
            mimeParts.push(
                `Content-Type: ${attachment.mimeType}; name="${attachment.filename}"`,
            );
            mimeParts.push(
                `Content-Disposition: attachment; filename="${attachment.filename}"`,
            );
            mimeParts.push(`Content-Transfer-Encoding: base64`);
            mimeParts.push('');
            mimeParts.push(encodedContent);
            mimeParts.push('');
        }

        mimeParts.push(`--${boundary}--`);
        mimeParts.push('');

        const rawMessage = Buffer.from(mimeParts.join(newline)).toString(
            'base64',
        );

        await this.gmail.users.messages.send({
            userId: 'me',
            auth: this.oauth2Client,
            requestBody: {
                raw: rawMessage,
            },
        });
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

            await this.gmail.users.messages.send({
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

    async getLetters(
        params: GmailLetterSearchParams = {},
        pageToken?: string,
        limit: number = 20,
    ): Promise<{ messages: ILetter[]; nextPageToken: string | null }> {
        const query = this.buildQuery(params);

        const res = await this.gmail.users.messages.list({
            userId: 'me',
            auth: this.oauth2Client,
            q: query,
            maxResults: limit,
            pageToken,
        });

        return {
            messages: await this.loadAndFormatFullMessages(res.data.messages),
            nextPageToken: res.data.nextPageToken || null,
        };
    }

    private buildQuery(params: GmailLetterSearchParams): string {
        const parts: string[] = [];

        if (params.dialogWith) {
            parts.push(
                `(from:${params.dialogWith} OR to:${params.dialogWith})`,
            );
        }

        parts.push(
            `(from:${this.GMAIL_TEAM_EMAIL} OR to:${this.GMAIL_TEAM_EMAIL})`,
        );

        return parts.join(' ');
    }
    private async loadAndFormatFullMessages(
        resMessages?: gmail_v1.Schema$Message[],
    ): Promise<ILetter[]> {
        if (!resMessages) return [];

        const messages = await Promise.all(
            resMessages.map((msg) =>
                this.gmail.users.messages.get({
                    userId: 'me',
                    id: msg.id!,
                    format: 'full',
                    auth: this.oauth2Client,
                }),
            ),
        );

        return messages.map(({ data }) => {
            const attachments = this.extractAttachments(data.payload);
            const body = this.extractBody(data.payload);
            const from =
                this.extractHeader(data.payload?.headers, 'From') || '';
            const to =
                this.extractHeader(data.payload?.headers, 'To')
                    ?.split(',')
                    .map((e) => e.trim()) || [];
            const subject =
                this.extractHeader(data.payload?.headers, 'Subject') || '';

            return {
                id: data.id!,
                threadId: data.threadId!,
                from,
                to,
                subject,
                date: this.unixTimeService.toDate(Number(data.internalDate)),
                snippet: data.snippet || '',
                attachments,
                body,
            };
        });
    }

    private extractAttachments(
        payload?: gmail_v1.Schema$MessagePart,
        collected: IAttachment[] = [],
    ): IAttachment[] {
        if (!payload) return collected;

        if (payload.body?.attachmentId && payload.filename) {
            collected.push({
                filename: payload.filename,
                mimeType: payload.mimeType || '',
                attachmentId: payload.partId!,
                size: payload.body.size || 0,
            });
        }

        if (payload.parts) {
            for (const part of payload.parts) {
                this.extractAttachments(part, collected);
            }
        }

        return collected;
    }

    private extractBody(payload?: gmail_v1.Schema$MessagePart): string {
        if (!payload) return '';

        if (payload.mimeType === 'text/plain' && payload.body?.data) {
            return this.decodeBase64(payload.body.data);
        }

        if (payload.parts) {
            for (const part of payload.parts) {
                if (part.mimeType === 'text/plain' && part.body?.data) {
                    return this.decodeBase64(part.body.data);
                }
            }

            for (const part of payload.parts) {
                if (part.mimeType === 'text/html' && part.body?.data) {
                    return this.decodeBase64(part.body.data);
                }
            }
        }

        return '';
    }

    private decodeBase64(data: string): string {
        const buff = Buffer.from(data, 'base64');
        return buff.toString('utf-8');
    }

    private extractHeader(
        headers: gmail_v1.Schema$MessagePartHeader[] = [],
        name: string,
    ): string | undefined | null {
        return headers.find((h) => h.name?.toLowerCase() == name.toLowerCase())
            ?.value;
    }
    private get accessToken() {
        return this._accessToken;
    }
    private set accessToken(accessToken: string) {
        this._accessToken = accessToken;
    }
}
