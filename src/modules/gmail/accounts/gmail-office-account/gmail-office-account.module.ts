import { forwardRef, Module } from '@nestjs/common';
import { GmailOfficeAccountService } from './gmail-office-account.service';
import { GmailModule } from '../../gmail.module';

@Module({
    imports: [forwardRef(() => GmailModule)],
    providers: [GmailOfficeAccountService],
    exports: [GmailOfficeAccountService],
})
export class GmailOfficeAccountModule {}
