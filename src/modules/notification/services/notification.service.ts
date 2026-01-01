import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GmailService } from '../../gmail/gmail.service';
import { EmailCategory } from '../../gmail/enums/email-type.enum';
import { UnsubscribeEmailService } from '../../unsubscribe-email/unsubscribe-email.service';
import { EmailSenderService } from './email-sender.service';
import { BaseLetter } from '../letters/base-letter';
import { IBaseLetterData } from '../letters/base-letter-data.interface';

@Injectable()
export class NotificationService {
    constructor(
        private readonly configService: ConfigService,
        private readonly gmailService: GmailService,
        private readonly unsubscribeEmailService: UnsubscribeEmailService,
        private readonly emailSenderService: EmailSenderService,
    ) {}

    async sendLetter<T extends IBaseLetterData>(letter: BaseLetter<T>) {
        if (
            letter.emailCategory == EmailCategory.MARKETING &&
            (await this.isUnsubscribed(letter.to))
        ) {
            return;
        }

        await this.emailSenderService.processAndSend(
            {
                to: letter.to,
                subject: letter.subject,
                language: letter.language,
                emailCategory: letter.emailCategory,
                templateFilename: letter.templateFileName,
                context: letter.context,
            },
            { saveInDb: letter.saveInDb },
        );
    }

    async submitContactUsForm(data: {
        email: string;
        subject: string;
        name: string;
        message: string;
        phone: string;
    }) {
        const { email, subject, name, message, phone } = data;

        await this.gmailService.noreply.sendEmail(
            this.configService.getOrThrow('GMAIL_CONTACT_US_SUBMIT_EMAIL'),
            `New Contact Form Submission from ${name}`,
            `You have received a new message via the Contact Us form.

Name: ${name}
Email: ${email}
Phone: ${phone}

Subject: ${subject}

Message:
${message}

—
This message was automatically generated.
`,
        );
    }

    private async isUnsubscribed(email: string): Promise<boolean> {
        return !!(await this.unsubscribeEmailService.getUnsubscribeEmail(
            email,
        ));
    }
}
