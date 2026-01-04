import { Module } from '@nestjs/common';
import { AirlineService } from './airline.service';
import { AirlineGateway } from './airline.gateway';
import { CacheModule } from '../cache/cache.module';
import { ElasticSearchModule } from '../elastic-search/elastic-search.module';

@Module({
    imports: [CacheModule, ElasticSearchModule],
    providers: [AirlineService, AirlineGateway],
    exports: [AirlineService],
})
export class AirlineModule {}
