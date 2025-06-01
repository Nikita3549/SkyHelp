import { Module } from '@nestjs/common';
import { FlightsService } from './flights.service';
import { FlightsController } from './flights.controller';

@Module({
    providers: [FlightsService],
    controllers: [FlightsController],
    exports: [FlightsService],
})
export class FlightsModule {}
