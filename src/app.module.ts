import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
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
import { AirlineModule } from './modules/airline/airline.module';
import { LanguageModule } from './modules/language/language.module';
import { ContactUsModule } from './modules/contact-us/contact-us.module';
import { BullModule } from '@nestjs/bullmq';
import { UnixTimeModule } from './modules/unix-time/unix-time.module';
import { LetterModule } from './modules/letter/letter.module';
import { ZohoModule } from './modules/zoho/zoho.module';
import { LogModule } from './modules/log/log.module';
import { GoogleSheetsModule } from './modules/google-sheets/google-sheets.module';
import { YandexMetrikaModule } from './modules/yandex-metrika/yandex-metrika.module';
import { EmailResumeClickModule } from './modules/email-resume-click/email-resume-click.module';
import { UnsubscribeEmailModule } from './modules/unsubscribe-email/unsubscribe-email.module';
import { GenerateLinksModule } from './modules/generate-links/generate-links.module';

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
        AirlineModule,
        LanguageModule,
        ContactUsModule,
        UnixTimeModule,
        LetterModule,
        ZohoModule,
        LogModule,
        GoogleSheetsModule,
        YandexMetrikaModule,
        EmailResumeClickModule,
        UnsubscribeEmailModule,
        GenerateLinksModule,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
