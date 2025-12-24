import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { GmailModule } from '../gmail/gmail.module';
import { TokenModule } from '../token/token.module';
import { UnsubscribeEmailModule } from '../unsubscribe-email/unsubscribe-email.module';
import { GenerateLinksModule } from '../generate-links/generate-links.module';

@Module({
    imports: [
        GmailModule,
        TokenModule,
        UnsubscribeEmailModule,
        GenerateLinksModule,
    ],
    providers: [NotificationService],
    exports: [NotificationService],
})
export class NotificationModule {}
