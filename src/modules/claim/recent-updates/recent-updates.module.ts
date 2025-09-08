import { forwardRef, Module } from '@nestjs/common';
import { RecentUpdatesService } from './recent-updates.service';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    providers: [RecentUpdatesService],
    exports: [RecentUpdatesService],
})
export class RecentUpdatesModule {}
