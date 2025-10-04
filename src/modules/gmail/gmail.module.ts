import { forwardRef, Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { ClaimModule } from '../claim/claim.module';
import { GmailOfficeAccountModule } from './accounts/gmail-office-account/gmail-office-account.module';
import { AttachmentModule } from './attachment/attachment.module';
import { EmailModule } from './email/email.module';
import { GmailNoreplyAccountModule } from './accounts/gmail-noreply-account/gmail-noreply-account.module';

@Module({
    imports: [
        ClaimModule,
        forwardRef(() => GmailOfficeAccountModule),
        forwardRef(() => GmailNoreplyAccountModule),
        AttachmentModule,
        EmailModule,
        GmailNoreplyAccountModule,
    ],
    providers: [GmailService],
    exports: [GmailService],
})
export class GmailModule {}
