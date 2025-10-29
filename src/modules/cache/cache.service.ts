import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { CACHE_TTL } from './constants';

@Injectable()
export class CacheService {
    constructor(private readonly redis: RedisService) {}

    async setCache(key: string, value: string) {
        await this.redis.set(key, value, 'EX', CACHE_TTL);
    }

    async getCache(key: string): Promise<string | null> {
        return this.redis.get(key);
    }
}
