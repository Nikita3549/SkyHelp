import { Module } from '@nestjs/common';
import { AirportService } from './airport.service';
import { AirportGateway } from './airport.gateway';
import { CacheModule } from '../cache/cache.module';
import { ElasticSearchModule } from '../elastic-search/elastic-search.module';

@Module({
    imports: [CacheModule, ElasticSearchModule],
    providers: [AirportService, AirportGateway],
    exports: [AirportService],
})
export class AirportModule {}
