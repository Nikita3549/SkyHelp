import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ADD_FLIGHT_STATUS_QUEUE_KEY } from '../constants';
import { ClaimService } from '../claim.service';
import { IAddFlightStatusJobData } from '../interfaces/job-data/add-flight-status-job-data.interface';
import { FlightService } from '../../flight/flight.service';
import { FlightStatusService } from '../flight-status/flight-status.service';
import { AirlineService } from '../../airline/airline.service';
import { MeteoStatusService } from '../meteo-status/meteo-status.service';

@Processor(ADD_FLIGHT_STATUS_QUEUE_KEY)
export class AddFlightStatusProcessor extends WorkerHost {
    constructor(
        private readonly flightService: FlightService,
        private readonly flightStatusService: FlightStatusService,
        private readonly airlineService: AirlineService,
        private readonly meteoStatusService: MeteoStatusService,
    ) {
        super();
    }

    async process(job: Job<IAddFlightStatusJobData>) {
        const { airlineIcao, flightNumber, flightDate, claimId, airportIcao } =
            job.data;
        const airline = await this.airlineService.getAirlineByIcao(airlineIcao);

        const flightCode = flightNumber.slice(2);

        if (!flightCode) {
            return;
        }

        let exactTime: Date | undefined;

        // const flightFromOAG = await this.flightService.getFlightFromOAG(
        //     flightCode,
        //     airlineIcao,
        //     new Date(flightDate),
        // );
        //
        // if (flightFromOAG) {
        //     await this.flightStatusService.createFlightStatus(
        //         {
        //             isCancelled: flightFromOAG.isCancelled,
        //             delayMinutes: flightFromOAG.delayMinutes,
        //             source: flightFromOAG.source,
        //         },
        //         claimId,
        //     );
        // }

        const flightFromFlightIo =
            await this.flightService.getFlightStatusFromFlightIo(
                flightCode,
                airline ? airline.iata : airlineIcao,
                new Date(flightDate),
            );

        if (flightFromFlightIo) {
            if (flightFromFlightIo.exactTime) {
                exactTime = flightFromFlightIo.exactTime;
            }

            await this.flightStatusService.createFlightStatus(
                {
                    isCancelled: flightFromFlightIo.isCancelled,
                    delayMinutes: flightFromFlightIo.delayMinutes,
                    source: flightFromFlightIo.source,
                    exactTime: flightFromFlightIo.exactTime,
                },
                claimId,
            );
        }

        const flightFromFlightStats =
            await this.flightService.getFlightFromFlightStats(
                flightCode,
                airlineIcao,
                new Date(flightDate),
            );

        if (flightFromFlightStats) {
            await this.flightStatusService.createFlightStatus(
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
            await this.flightStatusService.createFlightStatus(
                {
                    isCancelled: flightFromFlightAware.isCancelled,
                    delayMinutes: flightFromFlightAware.delayMinutes,
                    source: flightFromFlightAware.source,
                },
                claimId,
            );
        }

        const flightFromChisinauAirport =
            await this.flightService.getFlightFromChisinauAirport({
                airlineIata: airline?.iata || airlineIcao,
                date: new Date(flightDate),
                flightCode: flightCode,
            });

        if (flightFromChisinauAirport) {
            if (flightFromChisinauAirport.exactTime) {
                exactTime = flightFromChisinauAirport.exactTime;
            }

            await this.flightStatusService.createFlightStatus(
                {
                    isCancelled: flightFromChisinauAirport.isCancelled,
                    delayMinutes: flightFromChisinauAirport.delayMinutes,
                    source: flightFromChisinauAirport.source,
                    exactTime: flightFromChisinauAirport.exactTime,
                },
                claimId,
            );
        }

        if (exactTime && airportIcao) {
            const meteoStatus = await this.meteoStatusService.fetchMeteoStatus({
                airportIcao: airportIcao,
                time: exactTime,
            });

            if (meteoStatus) {
                await this.meteoStatusService.create(meteoStatus, claimId);
            }
        }
    }
}
