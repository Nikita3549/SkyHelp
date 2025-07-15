import { Injectable } from '@nestjs/common';
import { GmailService } from '../../gmail/gmail.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
    constructor(
        private readonly configService: ConfigService,
        private readonly gmail: GmailService,
    ) {}

    async sendNoReplyEmail(to: string, subject: string, content: string) {
        await this.gmail.sendEmail(
            to,
            subject,
            content,
            this.configService.getOrThrow('GMAIL_NOREPLY_EMAIL'),
        );
    }
    async sendContactEmail(to: string, subject: string, content: string) {
        await this.gmail.sendEmail(
            to,
            subject,
            content,
            this.configService.getOrThrow('GMAIL_CONTACT_EMAIL'),
        );
    }

    async sendNoReplyEmailHtml(
        to: string,
        subject: string,
        htmlContent: string,
    ) {
        await this.gmail.sendEmailHtml(
            to,
            subject,
            htmlContent,
            this.configService.getOrThrow('GMAIL_NOREPLY_EMAIL'),
        );
    }
    async sendContactEmailHtml(
        to: string,
        subject: string,
        htmlContent: string,
    ) {
        await this.gmail.sendEmailHtml(
            to,
            subject,
            htmlContent,
            this.configService.getOrThrow('GMAIL_CONTACT_EMAIL'),
        );
    }
}
