import { Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { RecentUpdatesModule } from '../../claim/recent-updates/recent-updates.module';

@Module({
    imports: [RecentUpdatesModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {}
