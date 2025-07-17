import { Module } from '@nestjs/common';
import { FlightService } from './flight.service';
import { FlightController } from './flight.controller';

@Module({
    providers: [FlightService],
    controllers: [FlightController],
    exports: [FlightService],
})
export class FlightModule {}
