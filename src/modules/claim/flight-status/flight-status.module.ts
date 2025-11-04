import { forwardRef, Module } from '@nestjs/common';
import { FlightStatusService } from './flight-status.service';
import { FlightStatusController } from './flight-status.controller';
import { ClaimService } from '../claim.service';
import { ClaimModule } from '../claim.module';
import { FlightModule } from '../../flight/flight.module';

@Module({
    imports: [forwardRef(() => ClaimModule), FlightModule],
    providers: [FlightStatusService],
    controllers: [FlightStatusController],
    exports: [FlightStatusService],
})
export class FlightStatusModule {}
