import { forwardRef, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ClaimModule } from '../claim.module';
import { UserModule } from '../../user/user.module';
import { RecentUpdatesModule } from '../recent-updates/recent-updates.module';

@Module({
    imports: [forwardRef(() => ClaimModule), UserModule, RecentUpdatesModule],
    controllers: [AdminController],
})
export class AdminModule {}
