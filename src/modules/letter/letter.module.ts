import { Module } from '@nestjs/common';
import { LetterController } from './letter.controller';
import { GmailModule } from '../gmail/gmail.module';
import { EmailModule } from '../email/email.module';
import { EmailAttachmentModule } from '../email-attachment/email-attachment.module';
import { ClaimPersistenceModule } from '../claim-persistence/claim-persistence.module';

@Module({
    imports: [
        GmailModule,
        EmailModule,
        EmailAttachmentModule,
        ClaimPersistenceModule,
    ],
    controllers: [LetterController],
})
export class LetterModule {}
