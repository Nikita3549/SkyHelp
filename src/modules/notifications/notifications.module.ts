import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { EmailModule } from './email/email.module';

@Module({
    imports: [EmailModule],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule {}
