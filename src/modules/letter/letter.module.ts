import { Module } from '@nestjs/common';
import { LetterController } from './letter.controller';
import { GmailModule } from '../gmail/gmail.module';

@Module({
    imports: [GmailModule],
    controllers: [LetterController],
})
export class LetterModule {}
