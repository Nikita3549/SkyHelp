import { Module } from '@nestjs/common';
import { UnixTimeService } from './unix-time.service';

@Module({
    providers: [UnixTimeService],
    exports: [UnixTimeService],
})
export class UnixTimeModule {}
