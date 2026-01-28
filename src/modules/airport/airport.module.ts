import { Module } from '@nestjs/common';
import { AirportService } from './airport.service';
import { AirportGateway } from './airport.gateway';
import { CacheModule } from '../cache/cache.module';
import { ElasticSearchModule } from '../elastic-search/elastic-search.module';
import { DbStaticModule } from '../db-static/db-static.module';

@Module({
    imports: [CacheModule, ElasticSearchModule, DbStaticModule],
    providers: [AirportService, AirportGateway],
    exports: [AirportService],
})
export class AirportModule {}
