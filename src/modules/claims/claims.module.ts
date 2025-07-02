import { Module } from '@nestjs/common';
import { ClaimsController, PublicClaimsController } from './claims.controller';
import { ClaimsService } from './claims.service';
import { FlightsModule } from '../flights/flights.module';
import { TokenModule } from '../token/token.module';
import { AirportsModule } from '../airports/airports.module';

@Module({
    imports: [FlightsModule, TokenModule, AirportsModule],
    controllers: [ClaimsController, PublicClaimsController],
    providers: [ClaimsService],
    exports: [ClaimsService],
})
export class ClaimsModule {}
