import { Module } from '@nestjs/common';
import { TokenService } from './token.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
    providers: [TokenService, JwtStrategy],
    exports: [TokenService],
})
export class TokenModule {}
