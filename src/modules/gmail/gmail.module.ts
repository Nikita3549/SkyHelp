import { Module } from '@nestjs/common';
import { GmailService } from './gmail.service';
import { UnixTimeModule } from '../unix-time/unix-time.module';

@Module({
    imports: [UnixTimeModule],
    providers: [GmailService],
    exports: [GmailService],
})
export class GmailModule {}
