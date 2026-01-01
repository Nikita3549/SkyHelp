import { Body, Controller, Post } from '@nestjs/common';
import { SendContactUsDataDto } from './dto/send-contact-us-data.dto';
import { NotificationService } from '../notification/services/notification.service';

@Controller('contact-us')
export class ContactUsController {
    constructor(private readonly notificationsService: NotificationService) {}

    @Post()
    async sendContactUsData(@Body() body: SendContactUsDataDto) {
        const { email, subject, name, message, phone } = body;

        await this.notificationsService.submitContactUsForm({
            email,
            subject,
            name,
            message,
            phone,
        });
    }
}
