import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Req,
    Res,
    UnprocessableEntityException,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { JwtAuthGuard } from '../../common/guards/jwtAuth.guard';
import { GetLettersQueryDto } from './dto/get-letters-query.dto';
import { SendLetterDto } from './dto/send-letter.dto';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ATTACHMENT_NOT_FOUND } from '../gmail/constants';
import { Response } from 'express';
import { ClaimService } from '../claim/claim.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { AGENT_MUST_HAVE_CLAIM_ID, LETTER_NOT_FOUND } from './constants';
import { UpdateLetterDto } from './dto/update-letter.dto';
import { AuthRequest } from '../../common/interfaces/AuthRequest.interface';
import { EmailType, UserRole } from '@prisma/client';
import { CLAIM_NOT_FOUND } from '../claim/constants';
import { RoleGuard } from '../../common/guards/role.guard';
import { PatchFavoriteLetter } from './dto/patch-favorite-letter';
import { ISignedUrlResponse } from '../claim/document/controllers/interfaces/signed-url-response.interface';
import { logDocumentWithoutS3Key } from '../claim/document/utils/logDocumentWithoutS3Key';
import { GetAttachmentDto } from './dto/get-attachment.dto';
import { DocumentsUploadInterceptor } from '../../common/interceptors/documents/documents-upload.interceptor';

@Controller('letters')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([
        UserRole.ADMIN,
        UserRole.LAWYER,
        UserRole.AGENT,
        UserRole.PARTNER,
        UserRole.ACCOUNTANT,
    ]),
)
export class LetterController {
    constructor(
        private readonly gmailService: GmailService,
        private readonly configService: ConfigService,
        private readonly claimService: ClaimService,
    ) {}

    @Get()
    async getLetters(
        @Query() query: GetLettersQueryDto,
        @Req() req: AuthRequest,
    ) {
        const { claimId, page, type, status } = query;

        if (claimId) {
            const claim = await this.claimService.getClaim(claimId);

            if (!claim) {
                throw new NotFoundException(CLAIM_NOT_FOUND);
            }
        }

        if (req.user.role == UserRole.AGENT && !claimId) {
            throw new ForbiddenException(AGENT_MUST_HAVE_CLAIM_ID);
        }

        return this.gmailService.email.getEmails(page, claimId, type, status);
    }

    @Post()
    @DocumentsUploadInterceptor('attachments')
    async sendLetter(
        @Req() req: AuthRequest,
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Body() dto: SendLetterDto,
    ) {
        let { to, subject, content, claimId, replyToMessageId } = dto;

        if (replyToMessageId) {
            const replyEmail =
                await this.gmailService.email.getEmailById(replyToMessageId);

            if (!replyEmail) {
                throw new NotFoundException('Letter for reply not found');
            }
            if (replyEmail.type == EmailType.SENT) {
                throw new UnprocessableEntityException(
                    'Reply can only be created for letters type INBOX. This letter has SENT type',
                );
            }

            subject = (replyEmail.subject || subject).startsWith('Re: ')
                ? replyEmail.subject || subject
                : `Re: ${subject}`;
        }

        const claim = await this.claimService.getClaim(claimId || '');

        if (
            req.user.role == UserRole.AGENT &&
            claim &&
            claim.agentId != req.user.id
        ) {
            throw new ForbiddenException(AGENT_MUST_HAVE_CLAIM_ID);
        }

        const message = await this.gmailService.office.sendEmailWithAttachments(
            to,
            subject,
            content,
            this.configService.getOrThrow('GMAIL_OFFICE_SENDER_NAME'),
            files.map((file) => ({
                filename: file.originalname,
                mimeType: file.mimetype,
                content: file.buffer,
            })),
            replyToMessageId,
        );

        const email = await this.gmailService.email.saveEmail({
            id: message.id!,
            threadId: message.threadId!,
            messageId: message.id,
            inReplyTo: replyToMessageId || null,
            references: replyToMessageId ? [replyToMessageId] : undefined,
            subject: subject,
            normalizedSubject: this.gmailService.normalizeSubject(subject),
            fromName: undefined,
            fromEmail: this.configService.getOrThrow('GMAIL_OFFICE_EMAIL'),
            toName: null,
            toEmail: to,
            snippet: message.snippet,
            bodyPlain: content,
            bodyHtml: null,
            sizeEstimate: message.sizeEstimate,
            internalDate:
                message.internalDate == null ? null : +message.internalDate,
            headersJson: JSON.stringify(message.payload?.headers),
            claimId: claim?.id,
            isInbox: false,
        });

        const attachments = await Promise.all(
            files.map(async (file) => {
                const { s3Key } = await this.gmailService.uploadFileBuffer(
                    {
                        filename: file.originalname,
                        data: file.buffer,
                    },
                    email,
                );

                return await this.gmailService.attachment.saveAttachment({
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    s3Key,
                    emailId: email.id,
                });
            }),
        );

        return {
            ...email,
            attachments: attachments.map((a) => ({
                id: a.id,
                filename: a.filename,
                mimeType: a.mimeType,
                size: a.size,
                emailId: email.id,
                createdAt: email.createdAt,
            })),
        };
    }

    @Get('/attachments/:attachmentId')
    async getLetterAttachment(
        @Req() req: AuthRequest,
        @Param('attachmentId') attachmentId: string,
        @Query() query: GetAttachmentDto,
    ): Promise<ISignedUrlResponse> {
        const { disposition } = query;
        const attachment =
            await this.gmailService.attachment.getAttachmentById(attachmentId);

        if (!attachment) {
            throw new NotFoundException(ATTACHMENT_NOT_FOUND);
        }

        if (req.user.role == UserRole.AGENT) {
            const email = await this.gmailService.email.getEmailById(
                attachment.emailId,
            );

            if (!email?.claimId) {
                throw new NotFoundException(ATTACHMENT_NOT_FOUND);
            }

            const claim = await this.claimService.getClaim(email.claimId);

            if (!claim || claim.agentId != req.user.id) {
                throw new NotFoundException(ATTACHMENT_NOT_FOUND);
            }
        }

        if (!attachment.s3Key) {
            logDocumentWithoutS3Key(`attachment - ${attachment.id}`);
            throw new InternalServerErrorException();
        }

        const { signedUrl } = await this.gmailService.attachment.readAttachment(
            attachment.s3Key,
            { disposition },
        );

        return {
            signedUrl,
            contentType: attachment.mimeType,
        };
    }

    @Patch(':letterId')
    async updateStatus(
        @Req() req: AuthRequest,
        @Body() dto: UpdateStatusDto,
        @Param('letterId') letterId: string,
    ) {
        const { newStatus } = dto;

        const email = await this.gmailService.email.getEmailById(letterId);

        if (!email) {
            throw new NotFoundException(LETTER_NOT_FOUND);
        }

        if (req.user.role == UserRole.AGENT) {
            if (!email?.claimId) {
                throw new NotFoundException(LETTER_NOT_FOUND);
            }

            const claim = await this.claimService.getClaim(email.claimId);

            if (!claim || claim.agentId != req.user.id) {
                throw new NotFoundException(LETTER_NOT_FOUND);
            }
        }

        return await this.gmailService.email.updateStatus(newStatus, letterId);
    }

    @Put(':letterId')
    async updateLetter(
        @Req() req: AuthRequest,
        @Param('letterId') letterId: string,
        @Body() dto: UpdateLetterDto,
    ) {
        const { claimId } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const email = await this.gmailService.email.getEmailById(letterId);

        if (!email) {
            throw new NotFoundException(LETTER_NOT_FOUND);
        }

        if (req.user.role == UserRole.AGENT) {
            if (!email?.claimId) {
                throw new NotFoundException(LETTER_NOT_FOUND);
            }

            const claim = await this.claimService.getClaim(email.claimId);

            if (!claim || claim.agentId != req.user.id) {
                throw new NotFoundException(LETTER_NOT_FOUND);
            }
        }

        return await this.gmailService.email.updateClaimId(claimId, letterId);
    }

    @Patch(':letterId/favorite')
    async patchFavoriteLetter(
        @Body() dto: PatchFavoriteLetter,
        @Param('letterId') letterId: string,
    ) {
        const letter = await this.gmailService.email.getEmailById(letterId);

        if (!letter) {
            throw new NotFoundException(LETTER_NOT_FOUND);
        }

        return await this.gmailService.email.patchFavorite(
            letter.id,
            dto.favorite,
        );
    }
}
