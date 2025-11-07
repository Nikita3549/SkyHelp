import { Injectable } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { DAY } from '../../../common/constants/time.constants';

@Injectable()
export class UrlShortenerService {
    constructor(private readonly redis: RedisService) {}

    async saveShortenUrl(originalUrl: string, shortenUrl: string) {
        const redisKey = this.getShortenUrlRedisKey(shortenUrl);

        this.redis.set(redisKey, originalUrl, 'PX', DAY * 30);

        return shortenUrl;
    }

    async getOriginalUrl(shortenUrl: string) {
        const redisKey = this.getShortenUrlRedisKey(shortenUrl);

        return this.redis.get(redisKey);
    }

    private getShortenUrlRedisKey(shortenUrl: string) {
        return `${shortenUrl}:shortenUrl`;
    }
}
