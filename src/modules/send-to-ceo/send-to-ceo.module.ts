import { Module } from '@nestjs/common';
import { SendToCeoController } from './send-to-ceo.controller';
import { GmailModule } from '../gmail/gmail.module';

@Module({
    imports: [GmailModule],
    controllers: [SendToCeoController],
})
export class SendToCeoModule {}
