import { Module } from '@nestjs/common';
import { ContactUsController } from './contact-us.controller';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [NotificationsModule],
    controllers: [ContactUsController],
})
export class ContactUsModule {}
