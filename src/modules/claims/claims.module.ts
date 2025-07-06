import { Module } from '@nestjs/common';
import { ClaimsController, PublicClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { FlightsModule } from '../flights/flights.module';
import { TokenModule } from '../token/token.module';
import { AirportsModule } from '../airports/airports.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
    imports: [
        FlightsModule,
        TokenModule,
        AirportsModule,
        ClaimsModule,
        NotificationsModule,
    ],
    controllers: [ClaimsController, PublicClaimsController],
    providers: [ClaimsService],
    exports: [ClaimsService],
})
export class ClaimsModule {}
