import { forwardRef, Module } from '@nestjs/common';
import { GmailNoreplyAccountService } from './gmail-noreply-account.service';
import { GmailModule } from '../../gmail.module';

@Module({
    imports: [forwardRef(() => GmailModule)],
    providers: [GmailNoreplyAccountService],
    exports: [GmailNoreplyAccountService],
})
export class GmailNoreplyAccountModule {}
