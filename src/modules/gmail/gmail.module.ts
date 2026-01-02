import { Module } from '@nestjs/common';
import { GmailService } from './services/gmail.service';
import { EmailAttachmentModule } from '../email-attachment/email-attachment.module';
import { EmailModule } from '../email/email.module';
import { S3Module } from '../s3/s3.module';
import { GmailNoreplyService } from './services/gmail-noreply.service';
import { GmailOfficeService } from './services/gmail-office.service';

@Module({
    imports: [EmailAttachmentModule, EmailModule, S3Module],
    providers: [GmailService, GmailNoreplyService, GmailOfficeService],
    exports: [GmailService, GmailNoreplyService, GmailOfficeService],
})
export class GmailModule {}
