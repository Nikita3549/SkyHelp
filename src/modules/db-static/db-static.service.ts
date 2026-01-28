import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

@Injectable()
export class DbStaticService extends Pool implements OnModuleDestroy {
    constructor(private readonly configService: ConfigService) {
        super({
            user: configService.getOrThrow('DATABASE_STATIC_USER'),
            database: configService.getOrThrow('DATABASE_STATIC_DBNAME'),
            password: configService.getOrThrow('DATABASE_STATIC_PASSWORD'),
            host: configService.getOrThrow('DATABASE_STATIC_HOST'),
            port:
                process.env.NODE_ENV == 'LOCAL_DEV'
                    ? configService.getOrThrow('DATABASE_STATIC_PORT')
                    : 5432,
        });
    }

    async onModuleDestroy() {
        await this.end();
    }
}
