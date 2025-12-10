import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import { Interval } from '@nestjs/schedule';
import { PubSub } from '@google-cloud/pubsub';
import { GmailService } from '../../gmail.service';
import { isProd } from '../../../../utils/isProd';
import { ClaimRecentUpdatesType } from '@prisma/client';
import { RecentUpdatesService } from '../../../claim/recent-updates/recent-updates.service';
import { DAY, HOUR, MINUTE } from '../../../../common/constants/time.constants';
import Gmail = gmail_v1.Gmail;

@Injectable()
export class GmailOfficeAccountService implements OnModuleInit {
    private oauth2Client: OAuth2Client;
    private _accessToken: string;
    private gmail: Gmail;
    private pubsub: PubSub;
    private expiration: number | null = null;
    private startHistoryId: string;

    constructor(
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => GmailService))
        private readonly gmailService: GmailService,
        private readonly recentUpdatesService: RecentUpdatesService,
    ) {
        if (!isProd()) return;

        this.pubsub = new PubSub({
            projectId: this.configService.getOrThrow(
                'GMAIL_OFFICE_PUBSUB_PROJECT_ID',
            ),
            credentials: {
                client_email: this.configService.getOrThrow(
                    'GMAIL_OFFICE_PUBSUB_SERVICE_EMAIL',
                ),
                private_key: this.configService.getOrThrow(
                    'GMAIL_OFFICE_PUBSUB_PRIVATE_KEY',
                ),
            },
        });
    }

    async sendEmailWithAttachments(
        to: string,
        subject: string,
        content: string,
        from: string,
        attachments: { filename: string; content: Buffer; mimeType: string }[],
        replyToMessageId?: string,
    ): Promise<gmail_v1.Schema$Message> {
        return this.gmailService.sendEmailWithAttachments(
            to,
            subject,
            content,
            from,
            attachments,
            this.gmail,
            replyToMessageId,
        );
    }

    async handleMessage(message: gmail_v1.Schema$Message) {
        const headers = message.payload?.headers;
        const gmailThreadId = message.threadId;
        const messageId = message.id;
        const inReplyTo = this.gmailService
            .normalizeMessageIds(
                this.gmailService.extractHeader(headers, 'In-Reply-To'),
            )
            .join();
        const references = this.gmailService.normalizeMessageIds(
            this.gmailService.extractHeader(headers, 'References'),
        );
        const subject = this.gmailService.extractHeader(headers, 'Subject');
        const normalizedSubject = this.gmailService.normalizeSubject(subject);
        const isInbox = message.labelIds?.includes('INBOX');
        const { name: fromName, email: fromEmail } =
            this.gmailService.parseFromHeader(
                this.gmailService.extractHeader(headers, 'From'),
            );
        const { name: toName, email: toEmail } =
            this.gmailService.parseFromHeader(
                this.gmailService.getFromHeaderTo(message)[0],
            );
        const snippet = message.snippet;
        const { bodyHtml, bodyPlain } = this.gmailService.extractBody(
            message.payload,
        );
        const sizeEstimate = message.sizeEstimate;
        const internalDate = message.internalDate;
        const headersJson = JSON.stringify(message.payload?.headers);
        const attachments = this.gmailService.extractAttachments(
            message.payload,
        );

        if (!messageId || !gmailThreadId || !fromEmail) {
            throw new Error(
                `Missing messageId or gmailThreadId or fromEmail \n${JSON.stringify(message)}`,
            );
        }

        const claimId = await this.gmailService.findClaimIdForEmail(
            fromEmail,
            gmailThreadId,
        );
        if (!subject || !isInbox) {
            return;
        }
        const email = await this.gmailService.email.saveEmail({
            id: messageId,
            threadId: gmailThreadId,
            messageId,
            inReplyTo,
            references,
            subject,
            normalizedSubject,
            fromName,
            fromEmail,
            toName,
            toEmail,
            snippet,
            bodyPlain,
            bodyHtml,
            sizeEstimate,
            internalDate: internalDate == null ? null : +internalDate,
            headersJson,
            claimId,
            isInbox,
        });
        if (!email) {
            return;
        }
        if (claimId) {
            await this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.EMAIL,
                    updatedEntityId: email.id,
                    entityData: `${email.fromName}`,
                },
                claimId,
            );
        }
        attachments.forEach((attachment) => {
            (async () => {
                const { filename, data, mimeType } =
                    await this.gmailService.getAttachmentByIdFromGmail(
                        messageId,
                        attachment.id,
                        this.gmail,
                        this.oauth2Client,
                    );

                const path = await this.gmailService.uploadFileBuffer({
                    filename,
                    data,
                });

                await this.gmailService.attachment.saveAttachment({
                    filename,
                    mimeType,
                    size: attachment.size,
                    path,
                    emailId: email.id,
                });
            })();
        });
    }

    async onModuleInit() {
        try {
            this.oauth2Client = new google.auth.OAuth2(
                this.configService.getOrThrow('GMAIL_OFFICE_CLIENT_ID'),
                this.configService.getOrThrow('GMAIL_OFFICE_SECRET'),
                this.configService.getOrThrow('GMAIL_OFFICE_REDIRECT_URI'),
            );

            this.oauth2Client.setCredentials({
                refresh_token: this.configService.getOrThrow(
                    'GMAIL_OFFICE_REFRESH_TOKEN',
                ),
            });

            this.gmail = google.gmail({
                version: 'v1',
                auth: this.oauth2Client,
            });

            await this.refreshAccessToken();

            if (!isProd()) return;

            await this.watchMailbox();

            this.pullMessages();
        } catch (err) {
            throw err;
        }
    }

    pullMessages() {
        if (!isProd()) return;

        const subscription = this.pubsub.subscription(
            this.configService.getOrThrow(
                'GMAIL_OFFICE_PUBSUB_SUBSCRIPTION_NAME',
            ),
        );

        subscription.on('message', async (message) => {
            try {
                JSON.parse(message.data.toString('utf8'));

                const newMessage = await this.getNewMessages().finally(() => {
                    message.ack();
                });

                if (!newMessage) {
                    throw new Error(
                        `Cannot get new message, ${JSON.stringify(message, null, 2)}`,
                    );
                }

                await this.handleMessage(newMessage);
            } catch (_err: unknown) {
                message.nack();
            }
        });
    }

    @Interval(MINUTE * 55)
    async refreshAccessToken() {
        const maxAttempts = 5;
        let attempt = 0;

        while (attempt < maxAttempts) {
            attempt++;
            try {
                const tokens = await this.oauth2Client.refreshAccessToken();
                const accessToken = tokens.credentials.access_token;

                if (!accessToken) throw new Error('No access token received');

                this.accessToken = accessToken;
                return;
            } catch (err) {
                if (attempt >= maxAttempts) throw err;
                await new Promise((res) => setTimeout(res, 1000 * attempt));
            }
        }
    }

    async watchMailbox(labelIds = ['INBOX']) {
        if (!isProd()) return;

        try {
            const topicName = this.configService.getOrThrow(
                'GMAIL_OFFICE_PUBSUB_TOPIC_NAME',
            );
            const res = await this.gmail.users.watch({
                userId: 'me',
                requestBody: {
                    topicName,
                    labelIds,
                },
            });

            this.startHistoryId = res.data.historyId!;
            this.expiration = Number(res.data.expiration);

            return res.data;
        } catch (err) {
            throw err;
        }
    }

    @Interval(HOUR * 6)
    async refreshWatchIfNeeded() {
        if (!isProd()) return;
        const now = Date.now();

        if (!this.expiration || now > this.expiration - DAY) {
            await this.watchMailbox();
        } else {
            const hoursLeft = Math.round((this.expiration - now) / HOUR);
        }
    }

    async getNewMessages(): Promise<
        gmail_v1.Schema$Message | null | undefined
    > {
        if (!isProd()) return;
        try {
            const history = await this.gmail.users.history.list({
                userId: 'me',
                startHistoryId: this.startHistoryId,
                historyTypes: ['messageAdded'],
            });

            if (!history.data.history) {
                return;
            }

            return new Promise(async (resolve) => {
                for (const record of history.data.history!) {
                    if (record.messagesAdded) {
                        for (const msg of record.messagesAdded) {
                            const messageId = msg.message!.id as string;

                            const message = await this.gmail.users.messages.get(
                                {
                                    userId: 'me',
                                    id: messageId,
                                    format: 'full',
                                },
                            );

                            this.startHistoryId = record.id!;

                            resolve(message.data);
                        }
                    }
                }
            });
        } catch (err) {}
    }

    get accessToken(): string {
        return this._accessToken;
    }

    set accessToken(value: string) {
        this._accessToken = value;
    }
}
