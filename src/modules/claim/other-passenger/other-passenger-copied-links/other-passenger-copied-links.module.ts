import { Module } from '@nestjs/common';
import { OtherPassengerCopiedLinksService } from './other-passenger-copied-links.service';

@Module({
    providers: [OtherPassengerCopiedLinksService],
    exports: [OtherPassengerCopiedLinksService],
})
export class OtherPassengerCopiedLinksModule {}
