import { Module } from '@nestjs/common';
import { NotificationService } from './services/notification.service';
import { GmailModule } from '../gmail/gmail.module';
import { TokenModule } from '../token/token.module';
import { UnsubscribeEmailModule } from '../unsubscribe-email/unsubscribe-email.module';
import { S3Module } from '../s3/s3.module';
import { EmailSenderService } from './services/email-sender.service';

@Module({
    imports: [GmailModule, TokenModule, UnsubscribeEmailModule, S3Module],
    providers: [NotificationService, EmailSenderService],
    exports: [NotificationService],
})
export class NotificationModule {}
