import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
    ClaimRecentUpdatesType,
    Email,
    EmailStatus,
    EmailType,
    Prisma,
} from '@prisma/client';
import { GmailEmailPayload } from '../gmail/interfaces/gmail-email-payload.interface';
import { RecentUpdatesService } from '../claim/recent-updates/recent-updates.service';
import { ClaimPersistenceService } from '../claim-persistence/services/claim-persistence.service';

@Injectable()
export class EmailService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    async getEmailById(emailId: string) {
        return this.prisma.email.findFirst({
            where: {
                id: emailId,
            },
        });
    }

    async updateStatus(newStatus: EmailStatus, emailId: string) {
        return this.prisma.email.update({
            data: {
                status: newStatus,
            },
            where: {
                id: emailId,
            },
        });
    }

    async updateClaimId(newClaimId: string, emailId: string) {
        const email = await this.prisma.email.update({
            data: {
                claimId: newClaimId,
            },
            where: {
                id: emailId,
            },
        });

        return email;
    }

    async findClaimIdForEmail(
        fromEmail: string,
        threadId: string,
    ): Promise<string | null> {
        const email = await this.getEmailByThreadId(threadId);

        if (email?.claimId) {
            return email.claimId;
        }

        const claim =
            await this.claimPersistenceService.findOneByEmail(fromEmail);

        if (claim?.archived) {
            return null;
        }

        return claim?.id || null;
    }

    async saveEmail(data: GmailEmailPayload) {
        const internalDate = data.internalDate
            ? data.internalDate instanceof Date
                ? data.internalDate
                : new Date(Number(data.internalDate))
            : undefined;

        if (!data.claimId && data.isInbox && data.fromEmail) {
            data.claimId = await this.findClaimIdForEmail(
                data.fromEmail,
                data.threadId,
            );
        }

        const email = await this.prisma.email.create({
            data: {
                id: data.id,
                gmailThreadId: data.threadId,
                messageId: data.messageId,
                inReplyTo: data.inReplyTo,
                references: data.references || [],
                subject: data.subject,
                normalizedSubject: data.normalizedSubject,
                fromName: data.fromName,
                fromEmail: data.fromEmail,
                toName: data.toName || '',
                toEmail: data.toEmail || '',
                snippet: data.snippet,
                bodyPlain: data.bodyPlain,
                bodyHtml: data.bodyHtml,
                sizeEstimate: data.sizeEstimate,
                internalDate,
                headersJson: data.headersJson || {},
                claimId: data.claimId || null,
                type: data.isInbox ? EmailType.INBOX : EmailType.SENT,
                status: data.isInbox ? EmailStatus.UNREAD : EmailStatus.READ,
            },
        });

        if (email.claimId) {
            await this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.EMAIL,
                    updatedEntityId: email.id,
                    entityData: `${email.fromName}`,
                },
                email.claimId,
            );
        }

        return email;
    }

    async getEmails(
        page: number,
        claimId?: string | null,
        type?: EmailType,
        status?: EmailStatus,
        pageSize: number = 20,
    ): Promise<{ letters: Email[]; total: number }> {
        const skip = (page - 1) * pageSize;
        const where: Prisma.EmailWhereInput = {
            claimId,
            type,
            status,
        };

        const [emails, total] = await this.prisma.$transaction([
            this.prisma.email.findMany({
                where,
                skip,
                orderBy: {
                    createdAt: 'desc',
                },
                take: pageSize,
                include: {
                    attachments: {
                        select: {
                            id: true,
                            filename: true,
                            mimeType: true,
                            size: true,
                            emailId: true,
                            createdAt: true,
                        },
                    },
                },
            }),
            this.prisma.email.count({
                where,
            }),
        ]);

        return {
            letters: emails,
            total,
        };
    }

    async getEmailByThreadId(threadId: string) {
        return this.prisma.email.findFirst({
            where: {
                gmailThreadId: threadId,
            },
        });
    }

    async patchFavorite(letterId: string, favorite: boolean) {
        return this.prisma.email.update({
            data: { favorite },
            where: { id: letterId },
        });
    }
}
