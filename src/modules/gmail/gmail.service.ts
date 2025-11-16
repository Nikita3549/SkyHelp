import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { gmail_v1, google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { ATTACHMENT_NOT_FOUND } from './constants';
import { IAttachment } from './interfaces/attachment.interface';
import { AttachmentNotFoundError } from './errors/attachment-not-found.error';
import { ParsedMailbox, parseOneAddress } from 'email-addresses';
import * as path from 'path';
import * as fs from 'fs/promises';
import { ClaimService } from '../claim/claim.service';
import { GmailOfficeAccountService } from './accounts/gmail-office-account/gmail-office-account.service';
import { AttachmentService } from './attachment/attachment.service';
import { EmailService } from './email/email.service';
import { GmailNoreplyAccountService } from './accounts/gmail-noreply-account/gmail-noreply-account.service';
import { UPLOAD_DIRECTORY_PATH } from '../../common/constants/paths/UploadsDirectoryPath';
import { EmailCategory } from './enums/email-type.enum';
import { MINUTE } from '../../common/constants/time.constants';
import Gmail = gmail_v1.Gmail;

@Injectable()
export class GmailService implements OnModuleInit {
    private oauth2Client: OAuth2Client;
    private _accessToken: string;
    private gmail: Gmail;
    private readonly FRONTEND_URL: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly claimService: ClaimService,
        @Inject(forwardRef(() => GmailOfficeAccountService))
        readonly office: GmailOfficeAccountService,
        @Inject(forwardRef(() => GmailNoreplyAccountService))
        readonly noreply: GmailNoreplyAccountService,
        readonly attachment: AttachmentService,
        readonly email: EmailService,
    ) {
        this.FRONTEND_URL = this.configService.getOrThrow('FRONTEND_URL');
    }

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

    async findClaimIdForEmail(
        fromEmail: string,
        threadId: string,
    ): Promise<string | null> {
        const email = await this.email.getEmailByThreadId(threadId);

        if (email?.claimId) {
            return email.claimId;
        }

        const claim = await this.claimService.getClaimByEmail(fromEmail);

        if (claim?.archived) {
            return null;
        }

        return claim?.id || null;
    }

    async getAttachmentByIdFromGmail(
        messageId: string,
        partId: string,
        gmail: gmail_v1.Gmail = this.gmail,
        oauth2Client: OAuth2Client = this.oauth2Client,
    ): Promise<{ filename: string; mimeType: string; data: Buffer }> {
        const message = await gmail.users.messages.get({
            userId: 'me',
            id: messageId,
            format: 'full',
            auth: oauth2Client,
        });

        const attachmentPart = this.findPartWithPartId(
            message.data.payload,
            partId,
        );
        if (!attachmentPart || !attachmentPart.body?.attachmentId) {
            throw new AttachmentNotFoundError(ATTACHMENT_NOT_FOUND);
        }

        const attachmentId = attachmentPart.body.attachmentId;

        const attachment = await gmail.users.messages.attachments.get({
            userId: 'me',
            messageId,
            id: attachmentId,
            auth: oauth2Client,
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
        gmail: gmail_v1.Gmail = this.gmail,
        emailCategory: EmailCategory = EmailCategory.TRANSACTIONAL,
    ) {
        try {
            const boundary = '__BOUNDARY__';

            const headers = [
                `From: ${from}`,
                `To: ${to}`,
                `Subject: ${subject}`,
                'MIME-Version: 1.0',
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
            ];

            if (emailCategory == EmailCategory.MARKETING) {
                headers.push(this.generateUnsubscribeHeader(to));
            }

            const rawMessage = Buffer.from(
                [
                    ...headers,
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

            const res = await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage,
                },
            });

            return res.data;
        } catch (error) {
            console.error('[Gmail]', error);
        }
    }

    async sendEmailWithAttachments(
        to: string,
        subject: string,
        content: string,
        from: string,
        attachments: { filename: string; content: Buffer; mimeType: string }[],
        gmail: gmail_v1.Gmail = this.gmail,
    ): Promise<gmail_v1.Schema$Message> {
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

        const res = await gmail.users.messages.send({
            userId: 'me',
            requestBody: {
                raw: rawMessage,
            },
        });

        return res.data;
    }

    async sendEmail(
        to: string,
        subject: string,
        content: string,
        from: string,
        gmail: gmail_v1.Gmail = this.gmail,
        emailCategory: EmailCategory = EmailCategory.TRANSACTIONAL,
    ) {
        try {
            const headers = [
                `From: ${from}`,
                `To: ${to}`,
                `Subject: ${subject}`,
            ];

            if (emailCategory == EmailCategory.MARKETING) {
                headers.push(this.generateUnsubscribeHeader(to));
            }

            const rawMessage = Buffer.from([...headers, '', content].join('\n'))
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            await gmail.users.messages.send({
                userId: 'me',
                requestBody: {
                    raw: rawMessage,
                },
            });
        } catch (error) {
            console.error('[Gmail]', error);
        }
    }

    private generateUnsubscribeHeader(to: string) {
        return `List-Unsubscribe: <https://${this.FRONTEND_URL}/unsubscribe?email=${encodeURIComponent(
            to,
        )}>`;
    }

    @Interval(MINUTE * 55)
    async refreshAccessToken() {
        try {
            const tokens = await this.oauth2Client.refreshAccessToken();
            const accessToken = tokens.credentials.access_token;

            if (!accessToken) throw new Error();

            this.accessToken = accessToken;
            console.log('[Gmail] Access token refreshed');
        } catch (err) {
            console.error('[Gmail] Failed to refresh access token', err);
        }
    }

    extractAttachments(
        payload?: gmail_v1.Schema$MessagePart,
        collected: IAttachment[] = [],
    ): IAttachment[] {
        if (!payload) return collected;

        if (payload.body?.attachmentId && payload.filename) {
            collected.push({
                filename: payload.filename,
                mimeType: payload.mimeType || '',
                id: payload.partId!,
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

    normalizeSubject(subject?: string | null) {
        if (!subject) return null;

        return subject
            .replace(/^(re|fw|fwd|ответ)(\[[0-9]+\])?:\s*/gi, '')
            .trim()
            .toLowerCase();
    }

    parseFromHeader(headerValue?: string | null) {
        if (!headerValue) return { name: null, email: null };

        const parsed = parseOneAddress(headerValue) as ParsedMailbox;
        return {
            name: parsed?.name || null,
            email: parsed?.address || null,
        };
    }

    extractBody(payload?: gmail_v1.Schema$MessagePart): {
        bodyPlain: string | null;
        bodyHtml: string | null;
    } {
        let bodyPlain: string | null = null;
        let bodyHtml: string | null = null;

        const traverse = (part?: gmail_v1.Schema$MessagePart) => {
            if (!part) return;

            if (part.parts && part.parts.length > 0) {
                for (const p of part.parts) traverse(p);
            }

            if (part.body?.data) {
                const decoded = this.decodeUrlBase64(part.body.data);
                const mt = part.mimeType || '';

                if (mt === 'text/plain') {
                    bodyPlain = bodyPlain ?? decoded;
                } else if (mt === 'text/html') {
                    bodyHtml = bodyHtml ?? decoded;
                } else if (mt.startsWith('text/')) {
                    bodyPlain = bodyPlain ?? decoded;
                }
            }
        };

        traverse(payload);

        return { bodyPlain, bodyHtml };
    }

    decodeUrlBase64(data: string): string {
        let normalized = data.replace(/-/g, '+').replace(/_/g, '/');
        const pad = normalized.length % 4;
        if (pad === 2) normalized += '==';
        else if (pad === 3) normalized += '=';
        else if (pad === 1) normalized += '===';

        return Buffer.from(normalized, 'base64').toString('utf-8');
    }

    extractHeader(
        headers: gmail_v1.Schema$MessagePartHeader[] = [],
        name: string,
    ): string | undefined | null {
        return headers.find((h) => h.name?.toLowerCase() == name.toLowerCase())
            ?.value;
    }

    normalizeMessageIds(refs?: string | null): string[] {
        return (
            refs
                ?.split(/\s+/)
                .map((ref) => ref.replace(/^<|>$/g, '').trim())
                .filter(Boolean) || []
        );
    }

    async uploadFileBuffer(file: { filename: string; data: Buffer }) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const ext = path.extname(file.filename);
        const fileName = `${uniqueSuffix}${ext}`;

        const uploadDir = UPLOAD_DIRECTORY_PATH;

        await fs.mkdir(uploadDir, { recursive: true });

        const filePath = path.join(uploadDir, fileName);
        await fs.writeFile(filePath, file.data);

        return filePath;
    }

    getFromHeaderTo(message: gmail_v1.Schema$Message): string[] {
        const headers = message.payload?.headers || [];
        const toHeader =
            headers.find((h) => h.name?.toLowerCase() === 'to')?.value || '';

        return toHeader
            .split(',')
            .map((addr) => addr.trim())
            .filter(Boolean);
    }

    private get accessToken() {
        return this._accessToken;
    }

    private set accessToken(accessToken: string) {
        this._accessToken = accessToken;
    }
}
