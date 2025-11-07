import { Module } from '@nestjs/common';
import { UrlShortenerController } from './url-shortener.controller';
import { UrlShortenerService } from './url-shortener.service';
import { RedisModule } from '../../redis/redis.module';
import { TokenModule } from '../../token/token.module';
import { OtherPassengerCopiedLinksModule } from '../../claim/other-passenger/other-passenger-copied-links/other-passenger-copied-links.module';

@Module({
    imports: [RedisModule, TokenModule, OtherPassengerCopiedLinksModule],
    controllers: [UrlShortenerController],
    providers: [UrlShortenerService],
    exports: [UrlShortenerService],
})
export class UrlShortenerModule {}
