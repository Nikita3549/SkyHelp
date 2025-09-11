import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RedisModule } from '../redis/redis.module';

@Module({
    imports: [RedisModule],
    providers: [TokenService, JwtStrategy],
    exports: [TokenService],
})
export class TokenModule {}
