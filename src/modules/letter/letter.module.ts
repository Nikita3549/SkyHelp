import { Module } from '@nestjs/common';
import { LetterController } from './letter.controller';
import { GmailModule } from '../gmail/gmail.module';
import { EmailModule } from '../email/email.module';
import { EmailAttachmentModule } from '../email-attachment/email-attachment.module';
import { ClaimPersistenceModule } from '../claim-persistence/claim-persistence.module';
import { LetterRefinerService } from './letter-refiner.service';
import { AiDataLetterController } from './ai-data-letter.controller';

@Module({
    imports: [
        GmailModule,
        EmailModule,
        EmailAttachmentModule,
        ClaimPersistenceModule,
    ],
    providers: [LetterRefinerService],
    controllers: [LetterController, AiDataLetterController],
})
export class LetterModule {}
