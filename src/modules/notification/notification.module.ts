import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GmailModule } from '../gmail/gmail.module';

@Module({
    imports: [GmailModule],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule {}
