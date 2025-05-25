import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthController } from './modules/auth/auth.controller';
import { AuthModule } from './modules/auth/auth.module';
import { UserController } from './modules/user/user.controller';
import { UserModule } from './modules/user/user.module';
import { TokenModule } from './modules/token/token.module';
import { PrismaModule } from './modules/prisma/prisma.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RedisModule } from './modules/redis/redis.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        AuthModule,
        UserModule,
        TokenModule,
        PrismaModule,
        NotificationsModule,
        RedisModule,
    ],
    controllers: [AppController, AuthController, UserController],
    providers: [AppService],
})
export class AppModule {}
