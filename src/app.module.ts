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
import { ClaimsModule } from './modules/claims/claims.module';
import { DocusignModule } from './modules/docusign/docusign.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AirportsModule } from './modules/airports/airports.module';
import { CacheModule } from './modules/cache/cache.module';
import { FlightsModule } from './modules/flights/flights.module';
import { ChatModule } from './modules/chat/chat.module';
import { GmailModule } from './modules/gmail/gmail.module';

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
        ClaimsModule,
        DocusignModule,
        ScheduleModule.forRoot(),
        AirportsModule,
        CacheModule,
        FlightsModule,
        ChatModule,
        GmailModule,
    ],
    controllers: [AppController, AuthController, UserController],
    providers: [AppService],
})
export class AppModule {}
