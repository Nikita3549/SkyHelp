import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { GmailModule } from '../gmail/gmail.module';

@Module({
    imports: [GmailModule],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule {}
