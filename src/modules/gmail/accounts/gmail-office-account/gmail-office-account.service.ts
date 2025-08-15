import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OAuth2Client } from 'google-auth-library';
import { gmail_v1, google } from 'googleapis';
import Gmail = gmail_v1.Gmail;
import { Interval } from '@nestjs/schedule';
import {
    FIFTY_FIVE_MINUTES,
    ONE_DAY,
    ONE_HOUR,
    SIX_HOURS,
} from '../../constants';
import { PubSub } from '@google-cloud/pubsub';
import { GmailService } from '../../gmail.service';
import { GmailOfficeAccountLogger } from './gmail-office-account.logger';

@Injectable()
export class GmailOfficeAccountService implements OnModuleInit {
    private oauth2Client: OAuth2Client;
    private _accessToken: string;
    private gmail: Gmail;
    private pubsub: PubSub;
    private expiration: number | null = null;
    private startHistoryId: string;
    private readonly logger: GmailOfficeAccountLogger;

    constructor(
        private readonly configService: ConfigService,
        @Inject(forwardRef(() => GmailService))
        private readonly gmailService: GmailService,
    ) {
        this.logger = new GmailOfficeAccountLogger();

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
    ): Promise<gmail_v1.Schema$Message> {
        return this.gmailService.sendEmailWithAttachments(
            to,
            subject,
            content,
            from,
            attachments,
            this.oauth2Client,
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
        attachments.forEach((attachment) => {
            (async () => {
                const { filename, data, mimeType } =
                    await this.gmailService.getAttachmentByIdFromGmail(
                        messageId!,
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
        this.logger.log('Module init started');

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

            this.logger.log('Starting watchMailbox...');
            await this.watchMailbox();

            this.logger.log('Starting pullMessages...');
            await this.pullMessages();

            await this.refreshAccessToken();

            this.logger.log('Module init finished');
        } catch (err) {
            this.logger.error('Module initialization failed', err);
            throw err;
        }
    }

    async pullMessages() {
        this.logger.log('Pull messages subscription started');

        const subscription = this.pubsub.subscription(
            this.configService.getOrThrow(
                'GMAIL_OFFICE_PUBSUB_SUBSCRIPTION_NAME',
            ),
        );

        subscription.on('message', async (message) => {
            this.logger.log('PubSub message received:', message.id);
            try {
                const data = JSON.parse(message.data.toString('utf8'));

                const newMessage = await this.getNewMessages().finally(() => {
                    message.ack();
                });

                if (!newMessage) {
                    throw new Error(
                        `Cannot get new message, ${JSON.stringify(message, null, 2)}`,
                    );
                }

                await this.handleMessage(newMessage);
            } catch (err) {
                message.nack();
            }
        });

        subscription.on('error', (error) => {
            this.logger.error('Subscription error:', error);
        });
    }

    @Interval(FIFTY_FIVE_MINUTES)
    async refreshAccessToken() {
        this.logger.log('Refreshing access token...');
        try {
            const tokens = await this.oauth2Client.refreshAccessToken();
            const accessToken = tokens.credentials.access_token;

            if (!accessToken) throw new Error('No access token received');

            this.accessToken = accessToken;
            this.logger.log('Access token refreshed');
        } catch (err) {
            this.logger.error('Failed to refresh access token', err);
        }
    }

    async watchMailbox(labelIds = ['INBOX']) {
        this.logger.log('Setting watch on mailbox...');
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

            this.logger.log(
                'Watch set. startHistoryId:',
                this.startHistoryId,
                'expiration:',
                this.expiration,
            );
            return res.data;
        } catch (err) {
            this.logger.error('Failed to set watch on mailbox', err);
            throw err;
        }
    }

    @Interval(SIX_HOURS)
    async refreshWatchIfNeeded() {
        this.logger.log('Checking watch expiration...');
        const now = Date.now();

        if (!this.expiration || now > this.expiration - ONE_DAY) {
            this.logger.warn('Watch expiring soon — refreshing...');
            await this.watchMailbox();
        } else {
            const hoursLeft = Math.round((this.expiration - now) / ONE_HOUR);
            this.logger.log(`Watch still valid, ${hoursLeft}h left`);
        }
    }

    async getNewMessages(): Promise<
        gmail_v1.Schema$Message | null | undefined
    > {
        this.logger.log(
            'Fetching new messages. startHistoryId:',
            this.startHistoryId,
        );
        try {
            const history = await this.gmail.users.history.list({
                userId: 'me',
                startHistoryId: this.startHistoryId,
                historyTypes: ['messageAdded'],
            });

            if (!history.data.history) {
                this.logger.log('No new history records');
                return;
            }

            return new Promise(async (resolve) => {
                for (const record of history.data.history!) {
                    this.logger.log('History record:', record.id);
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
                            this.logger.log(
                                'Updated startHistoryId:',
                                this.startHistoryId,
                            );

                            resolve(message.data);
                        }
                    }
                }
            });
        } catch (err) {
            this.logger.warn('Failed to fetch new messages', err);
        }
    }

    get accessToken(): string {
        return this._accessToken;
    }

    set accessToken(value: string) {
        this._accessToken = value;
    }
}
