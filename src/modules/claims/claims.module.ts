import { Module } from '@nestjs/common';
import { ClaimsController, PublicClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { FlightsModule } from '../flights/flights.module';
import { TokenModule } from '../token/token.module';
import { AirportsModule } from '../airports/airports.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { BullModule } from '@nestjs/bullmq';
import { CLAIM_QUEUE_KEY } from './constants';
import { ClaimsProcessor } from './claims.processor';

@Module({
    imports: [
        FlightsModule,
        TokenModule,
        AirportsModule,
        ClaimsModule,
        NotificationsModule,
        BullModule.registerQueue({
            name: CLAIM_QUEUE_KEY,
        }),
    ],
    controllers: [ClaimsController, PublicClaimsController],
    providers: [ClaimsService, ClaimsProcessor],
    exports: [ClaimsService],
})
export class ClaimsModule {}
