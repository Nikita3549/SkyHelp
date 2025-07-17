import { Module } from '@nestjs/common';
import { AirlineService } from './airline.service';
import { AirlineGateway } from './airline.gateway';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [CacheModule],
    providers: [AirlineService, AirlineGateway],
})
export class AirlineModule {}
