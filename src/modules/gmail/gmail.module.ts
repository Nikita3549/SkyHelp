import { forwardRef, Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { ClaimModule } from '../claim/claim.module';
import { GmailOfficeAccountModule } from './accounts/gmail-office-account/gmail-office-account.module';
import { AttachmentModule } from './attachment/attachment.module';
import { EmailModule } from './email/email.module';
import { GmailNoreplyAccountModule } from './accounts/gmail-noreply-account/gmail-noreply-account.module';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [
        forwardRef(() => ClaimModule),
        forwardRef(() => GmailOfficeAccountModule),
        forwardRef(() => GmailNoreplyAccountModule),
        AttachmentModule,
        EmailModule,
        GmailNoreplyAccountModule,
        S3Module,
    ],
    providers: [GmailService],
    exports: [GmailService],
})
export class GmailModule {}
