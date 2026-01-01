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
import { AirlineModule } from './modules/airline/airline.module';
import { LanguageModule } from './modules/language/language.module';
import { ContactUsModule } from './modules/contact-us/contact-us.module';
import { BullModule } from '@nestjs/bullmq';
import { LetterModule } from './modules/letter/letter.module';
import { GoogleSheetsModule } from './modules/google-sheets/google-sheets.module';
import { YandexMetrikaModule } from './modules/yandex-metrika/yandex-metrika.module';
import { EmailResumeClickModule } from './modules/email-resume-click/email-resume-click.module';
import { UnsubscribeEmailModule } from './modules/unsubscribe-email/unsubscribe-email.module';
import { GenerateLinksModule } from './modules/generate-links/generate-links.module';
import { SendToCeoModule } from './modules/send-to-ceo/send-to-ceo.module';
import { BotModule } from './modules/bot/bot.module';
import { PartnerModule } from './modules/referral/partner/partner.module';
import { ReferralTransactionModule } from './modules/referral/referral-transaction/referral-transaction.module';
import { PayoutModule } from './modules/referral/payout/payout.module';
import { ReferralLinksModule } from './modules/referral/referral-links/referral-links.module';
import { PaymentModule } from './modules/claim/payment/payment.module';
import { PrelitTemplatesModule } from './modules/prelit-templates/prelit-templates.module';
import { S3Module } from './modules/s3/s3.module';

@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        BullModule.forRoot({
            connection: {
                host: process.env.REDIS_HOST,
                password: process.env.REDIS_PASSWORD,
            },
        }),
        AuthModule,
        PaymentModule,
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
        AirlineModule,
        LanguageModule,
        ContactUsModule,
        LetterModule,
        GoogleSheetsModule,
        YandexMetrikaModule,
        EmailResumeClickModule,
        UnsubscribeEmailModule,
        GenerateLinksModule,
        SendToCeoModule,
        BotModule,
        PartnerModule,
        ReferralTransactionModule,
        PayoutModule,
        ReferralLinksModule,
        PrelitTemplatesModule,
        S3Module,
    ],
    controllers: [AppController],
    providers: [AppService],
})
export class AppModule {}
