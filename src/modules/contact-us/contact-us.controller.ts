import { Body, Controller, Post } from '@nestjs/common';
import { SendContactUsDataDto } from './dto/send-contact-us-data.dto';
import { NotificationsService } from '../notifications/notifications.service';

@Controller('contact-us')
export class ContactUsController {
    constructor(private readonly notificationsService: NotificationsService) {}
    @Post()
    async sendContactUsData(@Body() body: SendContactUsDataDto) {
        const { email, subject, name, message, phone } = body;

        await this.notificationsService.sendSubmitContactUsForm(
            email,
            subject,
            name,
            message,
            phone,
        );
    }
}
