import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Put,
    Query,
    Res,
    UploadedFiles,
    UseGuards,
    UseInterceptors,
} from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { IsModeratorGuard } from '../../guards/isModerator.guard';
import { GetLettersQueryDto } from './dto/get-letters-query.dto';
import { SendLetterDto } from './dto/send-letter.dto';
import { ConfigService } from '@nestjs/config';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ATTACHMENT_NOT_FOUND } from '../gmail/constants';
import { Response } from 'express';
import { ClaimService } from '../claim/claim.service';
import { UpdateStatusDto } from './dto/update-status.dto';
import { INVALID_CLAIM_ID, INVALID_LETTER_ID } from './constants';
import { UpdateLetterDto } from './dto/update-letter.dto';

@Controller('letters')
@UseGuards(JwtAuthGuard, IsModeratorGuard)
export class LetterController {
    constructor(
        private readonly gmailService: GmailService,
        private readonly configService: ConfigService,
        private readonly claimService: ClaimService,
    ) {}

    @Get()
    async getLetters(@Query() query: GetLettersQueryDto) {
        const { claimId, page, type, status } = query;

        return this.gmailService.email.getEmails(page, claimId, type, status);
    }

    @Post()
    @UseInterceptors(FilesInterceptor('attachments'))
    async sendLetter(
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Body() dto: SendLetterDto,
    ) {
        const { to, subject, content, claimId } = dto;

        const claim = await this.claimService.getClaim(claimId || '');

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
        );

        const email = await this.gmailService.email.saveEmail({
            id: message.id!,
            threadId: message.threadId!,
            messageId: message.id,
            inReplyTo: null,
            references: undefined,
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
                const path = await this.gmailService.uploadFileBuffer({
                    filename: file.originalname,
                    data: file.buffer,
                });

                return await this.gmailService.attachment.saveAttachment({
                    filename: file.originalname,
                    mimeType: file.mimetype,
                    size: file.size,
                    path,
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
        @Param('attachmentId') attachmentId: string,
        @Res() res: Response,
    ) {
        const attachment =
            await this.gmailService.attachment.getAttachmentById(attachmentId);

        if (!attachment) {
            throw new NotFoundException(ATTACHMENT_NOT_FOUND);
        }

        const data = await this.gmailService.attachment.readAttachment(
            attachment.path,
        );

        res.set({
            'Content-Type': attachment.mimeType,
            'Content-Disposition': `attachment; filename="${attachment.filename}"`,
            'Content-Length': data.length,
        });

        res.send(data);
    }

    @Patch(':letterId')
    async updateStatus(
        @Body() dto: UpdateStatusDto,
        @Param('letterId') letterId: string,
    ) {
        const { newStatus } = dto;

        const email = await this.gmailService.email.getEmailById(letterId);

        if (!email) {
            throw new NotFoundException(INVALID_LETTER_ID);
        }

        return await this.gmailService.email.updateStatus(newStatus, letterId);
    }

    @Put(':letterId')
    async updateLetter(
        @Param('letterId') letterId: string,
        @Body() dto: UpdateLetterDto,
    ) {
        const { claimId } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        const email = await this.gmailService.email.getEmailById(letterId);

        if (!email) {
            throw new NotFoundException(INVALID_LETTER_ID);
        }

        return await this.gmailService.email.updateClaimId(claimId, letterId);
    }
}
