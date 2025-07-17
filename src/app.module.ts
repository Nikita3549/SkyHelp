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
import { NotificationModule } from './modules/notification/notification.module';
import { RedisModule } from './modules/redis/redis.module';
import { ClaimModule } from './modules/claim/claim.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AirportModule } from './modules/airport/airport.module';
import { CacheModule } from './modules/cache/cache.module';
import { FlightModule } from './modules/flight/flight.module';
import { ChatModule } from './modules/chat/chat.module';
import { GmailModule } from './modules/gmail/gmail.module';
import { AirlineModule } from './modules/airline/airline.module';
import { LanguageModule } from './modules/language/language.module';
import { ContactUsModule } from './modules/contact-us/contact-us.module';
import { BullModule } from '@nestjs/bullmq';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST,
                password: process.env.REDIS_PASSWORD,
                port: +process.env.REDIS_PORT!,
            },
        }),
        AuthModule,
        UserModule,
        TokenModule,
        PrismaModule,
        NotificationModule,
        RedisModule,
        ClaimModule,
        ScheduleModule.forRoot(),
        AirportModule,
        CacheModule,
        FlightModule,
        ChatModule,
        GmailModule,
        AirlineModule,
        LanguageModule,
        ContactUsModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
