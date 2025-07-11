import { Body, Controller, Post } from '@nestjs/common';
import { SendContactUsDataDto } from './dto/send-contact-us-data.dto';
import { GmailService } from '../gmail/gmail.service';

@Controller('contact-us')
export class ContactUsController {
    constructor(private readonly gmailService: GmailService) {}
    @Post()
    async sendContactUsData(@Body() body: SendContactUsDataDto) {
        const { email, subject, name, message, phone } = body;

        await this.gmailService.sendNoReplyEmail(
            'ceo@skyhelp.md',
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
}
