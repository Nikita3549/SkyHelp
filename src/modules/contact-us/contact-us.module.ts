import { Module } from '@nestjs/common';
import { ContactUsController } from './contact-us.controller';
import { NotificationModule } from '../notification/notification.module';

@Module({
    imports: [NotificationModule],
    controllers: [ContactUsController],
})
export class ContactUsModule {}
