import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
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
import { AttachmentNotFoundError } from '../gmail/errors/attachment-not-found.error';
import { ATTACHMENT_NOT_FOUND } from '../gmail/constants';
import { Response } from 'express';

@Controller('letters')
@UseGuards(JwtAuthGuard, IsModeratorGuard)
export class LetterController {
    constructor(
        private readonly gmailService: GmailService,
        private readonly configService: ConfigService,
    ) {}

    @Get()
    async getLetters(@Query() query: GetLettersQueryDto) {
        const { dialogWith, pageToken } = query;

        return this.gmailService.getLetters({ dialogWith }, pageToken);
    }

    @Post()
    @UseInterceptors(FilesInterceptor('attachments'))
    async sendLetter(
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Body() dto: SendLetterDto,
    ) {
        const { to, subject, content } = dto;

        await this.gmailService.sendEmailWithAttachments(
            to,
            subject,
            content,
            this.configService.getOrThrow('GMAIL_TEAM_SENDER_NAME'),
            files.map((f) => ({
                filename: f.originalname,
                mimeType: f.mimetype,
                content: f.buffer,
            })),
        );
    }

    @Get(':letterId/attachments/:attachmentId')
    async getLetterAttachment(
        @Param('attachmentId') attachmentId: string,
        @Param('letterId') letterId: string,
        @Res() res: Response,
    ) {
        const { data, mimeType, filename } = await this.gmailService
            .getAttachmentById(letterId, attachmentId)
            .catch((e: unknown) => {
                if (e instanceof AttachmentNotFoundError) {
                    throw new NotFoundException(ATTACHMENT_NOT_FOUND);
                }
                console.error(e);
                throw e;
            });

        res.set({
            'Content-Type': mimeType,
            'Content-Disposition': `attachment; filename="${filename}"`,
            'Content-Length': data.length,
        });

        res.send(data);
    }
}
