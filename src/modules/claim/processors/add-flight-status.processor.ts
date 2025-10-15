import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ADD_FLIGHT_STATUS_QUEUE_KEY } from '../constants';
import { ClaimService } from '../claim.service';
import { IAddFlightStatusJobData } from '../interfaces/add-flight-status-job-data.interface';
import { FlightService } from '../../flight/flight.service';
import { ClaimFlightStatusSource } from '@prisma/client';

@Processor(ADD_FLIGHT_STATUS_QUEUE_KEY)
export class AddFlightStatusProcessor extends WorkerHost {
    constructor(
        private readonly claimService: ClaimService,
        private readonly flightService: FlightService,
    ) {
        super();
    }

    async process(job: Job<IAddFlightStatusJobData>) {
        const { airlineIcao, flightNumber, flightDate, claimId } = job.data;

        const flightCode = flightNumber.slice(2);

        const flightFromFlightStats =
            await this.flightService.getFlightFromFlightStats(
                flightCode,
                airlineIcao,
                new Date(flightDate),
            );

        if (flightFromFlightStats) {
            await this.claimService.createFlightStatus(
                {
                    isCancelled: flightFromFlightStats.isCancelled,
                    delayMinutes: flightFromFlightStats.delayMinutes,
                    source: flightFromFlightStats.source,
                },
                claimId,
            );
        }

        const flightFromFlightAware =
            await this.flightService.getFlightFromFlightAware(
                flightCode,
                airlineIcao,
                new Date(flightDate),
            );

        if (flightFromFlightAware) {
            await this.claimService.createFlightStatus(
                {
                    isCancelled: flightFromFlightAware.isCancelled,
                    delayMinutes: flightFromFlightAware.delayMinutes,
                    source: flightFromFlightAware.source,
                },
                claimId,
            );
        }
    }
}
