import { forwardRef, Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import { UserModule } from '../user/user.module';
import { TokenModule } from '../token/token.module';
import { NotificationModule } from '../notification/notification.module';
import { PassportModule } from '@nestjs/passport';
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [
        RedisModule,
        UserModule,
        TokenModule,
        NotificationModule,
        PassportModule,
        forwardRef(() => ClaimModule),
        NotificationModule,
    ],
    controllers: [AuthController],
    providers: [AuthService],
    exports: [AuthService],
})
export class AuthModule {}
