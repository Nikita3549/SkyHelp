import { Module } from '@nestjs/common';
import { AirlinesService } from './airlines.service';
import { AirlinesGateway } from './airlines.gateway';
import { CacheModule } from '../cache/cache.module';

@Module({
    imports: [CacheModule],
    providers: [AirlinesService, AirlinesGateway],
})
export class AirlinesModule {}
