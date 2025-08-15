import { Module } from '@nestjs/common';
import { AirportService } from './airport.service';
import { AirportGateway } from './airport.gateway';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [CacheModule],
    providers: [AirportService, AirportGateway],
    exports: [AirportService],
})
export class AirportModule {}
