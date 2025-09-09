import { forwardRef, Module } from '@nestjs/common';
import { GmailOfficeAccountService } from './gmail-office-account.service';
import { GmailModule } from '../../gmail.module';
import { RecentUpdatesModule } from '../../../claim/recent-updates/recent-updates.module';

@Module({
    imports: [forwardRef(() => GmailModule), RecentUpdatesModule],
    providers: [GmailOfficeAccountService],
    exports: [GmailOfficeAccountService],
})
export class GmailOfficeAccountModule {}
