import { Module } from '@nestjs/common';
import { FlightStatusService } from './flight-status.service';
import { FlightStatusController } from './flight-status.controller';
import { FlightModule } from '../../flight/flight.module';
import { AirlineModule } from '../../airline/airline.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';
import { DetailModule } from '../detail/detail.module';

@Module({
    imports: [
        FlightModule,
        AirlineModule,
        ClaimPersistenceModule,
        DetailModule,
    ],
    providers: [FlightStatusService],
    controllers: [FlightStatusController],
    exports: [FlightStatusService],
})
export class FlightStatusModule {}
