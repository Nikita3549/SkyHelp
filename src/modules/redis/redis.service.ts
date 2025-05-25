import { Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import * as process from 'process';

@Injectable()
export class RedisService extends Redis {
    constructor() {
        const redisConfig = {
            host: process.env.REDIS_HOST,
            password: process.env.REDIS_PASSWORD,
            port: +process.env.REDIS_PORT!,
        };
        super(redisConfig);
    }
}
