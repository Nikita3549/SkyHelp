import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ADD_FLIGHT_STATUS_QUEUE_KEY } from '../constants';
import { ClaimService } from '../claim.service';
import { IAddFlightStatusJobData } from '../interfaces/add-flight-status-job-data.interface';
import { FlightService } from '../../flight/flight.service';

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

        const flightStatus = await this.flightService.getFlightByFlightCode(
            flightCode,
            airlineIcao,
            new Date(flightDate),
        );

        let actualCancelled = false;
        let delayMinutes = 0;

        if (flightStatus) {
            actualCancelled =
                flightStatus.status == 'C' || flightStatus.status == 'R'; // C - cancelled, R - redirected
            delayMinutes = flightStatus.delays?.arrivalGateDelayMinutes
                ? flightStatus.delays.arrivalGateDelayMinutes
                : 0;

            await this.claimService.createFlightStatus(
                {
                    isCancelled: actualCancelled,
                    delayMinutes,
                },
                claimId,
            );
        }
    }
}
