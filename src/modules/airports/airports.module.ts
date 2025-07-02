import { Module } from '@nestjs/common';
import { AirportsService } from './airports.service';
import { AirportsGateway } from './airports.gateway';
import { TokenModule } from '../token/token.module';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [CacheModule],
    providers: [AirportsService, AirportsGateway],
    exports: [AirportsService],
})
export class AirportsModule {}
