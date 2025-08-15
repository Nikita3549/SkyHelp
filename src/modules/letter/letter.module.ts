import { Module } from '@nestjs/common';
import { LetterController } from './letter.controller';
import { GmailModule } from '../gmail/gmail.module';
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [GmailModule, ClaimModule],
    controllers: [LetterController],
})
export class LetterModule {}
