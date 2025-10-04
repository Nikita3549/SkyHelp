import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { GmailService } from '../gmail/gmail.service';
import { ConfigService } from '@nestjs/config';
import { SendToCeoDto } from './dto/send-to-ceo.dto';

@Controller('send-to-ceo')
export class SendToCeoController {
    constructor(
        private readonly gmailService: GmailService,
        private readonly configService: ConfigService,
    ) {}

    @Post()
    @HttpCode(HttpStatus.NO_CONTENT)
    async sendEmailToCeo(@Body() dto: SendToCeoDto) {
        const { subject, body } = dto;

        await this.gmailService.noreply.sendEmail(
            this.configService.getOrThrow('GMAIL_CEO_EMAIL'),
            subject,
            body,
        );
    }
}
