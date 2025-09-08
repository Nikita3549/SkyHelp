import { Module } from '@nestjs/common';
import { RecentUpdatesService } from './recent-updates.service';

@Module({
    providers: [RecentUpdatesService],
    exports: [RecentUpdatesService],
})
export class RecentUpdatesModule {}
