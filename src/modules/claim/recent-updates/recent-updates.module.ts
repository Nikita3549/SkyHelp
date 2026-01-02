import { forwardRef, Module } from '@nestjs/common';
import { RecentUpdatesService } from './recent-updates.service';
import { ClaimModule } from '../claim.module';
import { ActivityModule } from '../activity/activity.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [ActivityModule, ClaimPersistenceModule],
    providers: [RecentUpdatesService],
    exports: [RecentUpdatesService],
})
export class RecentUpdatesModule {}
