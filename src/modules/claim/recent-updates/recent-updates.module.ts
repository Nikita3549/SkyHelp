import { forwardRef, Module } from '@nestjs/common';
import { RecentUpdatesService } from './recent-updates.service';
import { ClaimModule } from '../claim.module';
import { ActivityModule } from '../activity/activity.module';

@Module({
    imports: [forwardRef(() => ClaimModule), ActivityModule],
    providers: [RecentUpdatesService],
    exports: [RecentUpdatesService],
})
export class RecentUpdatesModule {}
