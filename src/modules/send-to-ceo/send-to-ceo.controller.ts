import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SendToCeoDto } from './dto/send-to-ceo.dto';
import { GmailNoreplyService } from '../gmail/services/gmail-noreply.service';

@Controller('send-to-ceo')
export class SendToCeoController {
    constructor(
        private readonly configService: ConfigService,
        private readonly gmailNoreplyService: GmailNoreplyService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.NO_CONTENT)
    async sendEmailToCeo(@Body() dto: SendToCeoDto) {
        const { subject, body } = dto;

        await this.gmailNoreplyService.sendEmail(
            this.configService.getOrThrow('GMAIL_CEO_EMAIL'),
            subject,
            body,
        );
    }
}
