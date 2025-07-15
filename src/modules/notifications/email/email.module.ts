import { Module } from '@nestjs/common';
import { GmailModule } from '../../gmail/gmail.module';
import { EmailService } from './email.service';

@Module({
    imports: [GmailModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {}
