import {
    BadRequestException,
    Body,
    Controller,
    NotFoundException,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { FlightStatusService } from './flight-status.service';
import { FLIGHT_STATUS_NOT_FOUND } from './constants';
import { ClaimFlightStatusSource, UserRole } from '@prisma/client';
import { FlightService } from '../../flight/flight.service';
import { IFlightStatus } from '../../flight/interfaces/flight-status.interface';
import { CreateFlightStatusDto } from './dto/create-flight-status.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { RoleGuard } from '../../../common/guards/role.guard';
import { AirlineService } from '../../airline/airline.service';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';
import { MeteoStatusService } from '../meteo-status/meteo-status.service';

@Controller('claims/flight-statuses')
@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
export class FlightStatusController {
    constructor(
        private readonly flightStatusService: FlightStatusService,
        private readonly flightService: FlightService,
        private readonly airlinesService: AirlineService,
        private readonly claimPersistenceService: ClaimPersistenceService,
        private readonly meteoStatusService: MeteoStatusService,
    ) {}

    @Put(':flightStatusId')
    async refreshFlightStatus(@Param('flightStatusId') flightStatusId: string) {
        const flightStatus =
            await this.flightStatusService.getFlightStatus(flightStatusId);

        if (!flightStatus) {
            throw new NotFoundException(FLIGHT_STATUS_NOT_FOUND);
        }

        const claim = (await this.claimPersistenceService.findOneById(
            flightStatus.claimId,
        ))!;

        const flightCode = claim.details.flightNumber.slice(2);

        const airlineIcao = claim.details.airlines.icao;
        const flightDate = new Date(claim.details.date);
        let newFlightStatus: IFlightStatus | null;

        const troubledRoute =
            claim.details.routes.find((r) => r.troubled) ||
            claim.details.routes[0];

        const airline =
            await this.airlinesService.getAirlineByIcao(airlineIcao);
        switch (flightStatus.source) {
            case ClaimFlightStatusSource.OAG:
                newFlightStatus = await this.flightService.getFlightFromOAG(
                    flightCode,
                    airlineIcao,
                    flightDate,
                );
                break;
            case ClaimFlightStatusSource.FLIGHT_STATS:
                newFlightStatus =
                    await this.flightService.getFlightFromFlightStats(
                        flightCode,
                        airlineIcao,
                        flightDate,
                    );
                break;
            case ClaimFlightStatusSource.FLIGHT_AWARE:
                newFlightStatus =
                    await this.flightService.getFlightFromFlightAware(
                        flightCode,
                        airlineIcao,
                        flightDate,
                    );
                break;
            case ClaimFlightStatusSource.FLIGHT_IO:
                if (!airline) {
                    throw new NotFoundException(FLIGHT_STATUS_NOT_FOUND);
                }
                newFlightStatus =
                    await this.flightService.getFlightStatusFromFlightIo(
                        flightCode,
                        airline.iata,
                        flightDate,
                    );

                if (newFlightStatus?.exactTime) {
                    const meteoStatus =
                        await this.meteoStatusService.fetchMeteoStatus({
                            airportIcao: troubledRoute.DepartureAirport.icao,
                            time: newFlightStatus.exactTime,
                        });

                    if (meteoStatus) {
                        await this.meteoStatusService.create(
                            meteoStatus,
                            claim.id,
                        );
                    }
                }
                break;
            case ClaimFlightStatusSource.CHISINAU_AIRPORT:
                if (!airline) {
                    throw new NotFoundException(FLIGHT_STATUS_NOT_FOUND);
                }
                newFlightStatus =
                    await this.flightService.getFlightFromChisinauAirport({
                        flightCode,
                        airlineIata: airline.iata,
                        date: flightDate,
                    });

                if (newFlightStatus?.exactTime) {
                    const meteoStatus =
                        await this.meteoStatusService.fetchMeteoStatus({
                            airportIcao: troubledRoute.DepartureAirport.icao,
                            time: newFlightStatus.exactTime,
                        });

                    if (meteoStatus) {
                        await this.meteoStatusService.create(
                            meteoStatus,
                            claim.id,
                        );
                    }
                }
                break;
        }

        if (newFlightStatus) {
            await this.flightStatusService.deleteFlightStatus(flightStatusId);

            return await this.flightStatusService.createFlightStatus(
                {
                    ...newFlightStatus,
                },
                claim.id,
            );
        } else {
            throw new NotFoundException(FLIGHT_STATUS_NOT_FOUND);
        }
    }

    @Post()
    async createFlightStatus(@Body() dto: CreateFlightStatusDto) {
        const { claimId, source } = dto;
        const claim = await this.claimPersistenceService.findOneById(claimId);
        if (!claim) throw new NotFoundException(CLAIM_NOT_FOUND);

        const flightStatus =
            await this.flightStatusService.getFlightStatusBySourceAndClaimId(
                source,
                claimId,
            );

        if (flightStatus) {
            return flightStatus;
        }

        const flightCode = claim.details.flightNumber.slice(2);
        const airlineIcao = claim.details.airlines.icao;
        const flightDate = new Date(claim.details.date);

        let newFlightStatus: IFlightStatus | null;

        const airline =
            await this.airlinesService.getAirlineByIcao(airlineIcao);
        switch (source) {
            // case ClaimFlightStatusSource.OAG:
            //     newFlightStatus = await this.flightService.getFlightFromOAG(
            //         flightCode,
            //         airlineIcao,
            //         flightDate,
            //     );
            //     break;
            case ClaimFlightStatusSource.FLIGHT_STATS:
                newFlightStatus =
                    await this.flightService.getFlightFromFlightStats(
                        flightCode,
                        airlineIcao,
                        flightDate,
                    );
                break;
            case ClaimFlightStatusSource.FLIGHT_AWARE:
                newFlightStatus =
                    await this.flightService.getFlightFromFlightAware(
                        flightCode,
                        airlineIcao,
                        flightDate,
                    );
                break;
            case ClaimFlightStatusSource.CHISINAU_AIRPORT:
                if (!airline) {
                    throw new NotFoundException(FLIGHT_STATUS_NOT_FOUND);
                }
                newFlightStatus =
                    await this.flightService.getFlightFromChisinauAirport({
                        flightCode,
                        airlineIata: airline.iata,
                        date: flightDate,
                    });
                break;
            default:
                throw new BadRequestException('Invalid source');
        }

        if (!newFlightStatus) {
            throw new NotFoundException(FLIGHT_STATUS_NOT_FOUND);
        }

        return await this.flightStatusService.createFlightStatus(
            newFlightStatus,
            claim.id,
        );
    }
}
