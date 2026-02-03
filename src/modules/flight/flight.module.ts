import { forwardRef, Module } from '@nestjs/common';
import { FlightService } from './flight.service';
import { FlightController } from './flight.controller';
import { FlightStatusModule } from '../claim/flight-status/flight-status.module';

@Module({
    imports: [forwardRef(() => FlightStatusModule)],
    providers: [FlightService],
    controllers: [FlightController],
    exports: [FlightService],
})
export class FlightModule {}
