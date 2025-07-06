import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { TokenModule } from '../token/token.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PassportModule } from '@nestjs/passport';
import { ClaimsModule } from '../claims/claims.module';

@Module({
    imports: [
        RedisModule,
        UserModule,
        TokenModule,
        NotificationsModule,
        PassportModule,
        ClaimsModule,
    ],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService],
})
export class AuthModule {}
