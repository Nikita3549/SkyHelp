import { Module } from '@nestjs/common';
import { ContactUsController } from './contact-us.controller';
import { GmailModule } from '../gmail/gmail.module';

@Module({
    imports: [GmailModule],
    controllers: [ContactUsController],
})
export class ContactUsModule {}
