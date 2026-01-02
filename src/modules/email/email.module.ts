import { forwardRef, Module } from '@nestjs/common';
import { EmailService } from './email.service';
import { RecentUpdatesModule } from '../claim/recent-updates/recent-updates.module';
import { ClaimModule } from '../claim/claim.module';
import { ClaimPersistenceModule } from '../claim-persistence/claim-persistence.module';

@Module({
    imports: [RecentUpdatesModule, ClaimPersistenceModule],
    providers: [EmailService],
    exports: [EmailService],
})
export class EmailModule {}
