import { forwardRef, Module } from '@nestjs/common';
import { FlightStatusService } from './flight-status.service';
import { FlightStatusController } from './flight-status.controller';
import { ClaimModule } from '../claim.module';
import { FlightModule } from '../../flight/flight.module';
import { AirlineModule } from '../../airline/airline.module';

@Module({
    imports: [forwardRef(() => ClaimModule), FlightModule, AirlineModule],
    providers: [FlightStatusService],
    controllers: [FlightStatusController],
    exports: [FlightStatusService],
})
export class FlightStatusModule {}
