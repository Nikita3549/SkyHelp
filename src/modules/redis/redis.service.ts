import { Injectable, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService extends Redis implements OnModuleDestroy {
    constructor(private readonly configService: ConfigService) {
        const redisConfig = {
            host: configService.getOrThrow('REDIS_HOST'),
            password: configService.getOrThrow('REDIS_PASSWORD'),
        };
        super(redisConfig);
    }

    async onModuleDestroy() {
        this.disconnect();
    }
}
