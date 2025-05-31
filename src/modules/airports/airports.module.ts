import { Module } from '@nestjs/common';
import { AirportsService } from './airports.service';
import { AirportsGateway } from './airports.gateway';
import { TokenModule } from '../token/token.module';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [TokenModule, CacheModule],
    providers: [AirportsService, AirportsGateway],
})
export class AirportsModule {}
