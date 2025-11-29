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
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { FlightStatusService } from './flight-status.service';
import { FLIGHT_STATUS_NOT_FOUND } from './constants';
import { ClaimService } from '../claim.service';
import { ClaimFlightStatusSource, UserRole } from '@prisma/client';
import { FlightService } from '../../flight/flight.service';
import { IFlightStatus } from '../../flight/interfaces/flight-status.interface';
import { CreateFlightStatusDto } from './dto/create-flight-status.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { RoleGuard } from '../../../guards/role.guard';

@Controller('claims/flight-statuses')
@UseGuards(JwtAuthGuard, new RoleGuard([UserRole.ADMIN]))
export class FlightStatusController {
    constructor(
        private readonly flightStatusService: FlightStatusService,
        private readonly claimService: ClaimService,
        private readonly flightService: FlightService,
    ) {}

    @Put(':flightStatusId')
    async refreshFlightStatus(@Param('flightStatusId') flightStatusId: string) {
        const flightStatus =
            await this.flightStatusService.getFlightStatus(flightStatusId);

        if (!flightStatus) {
            throw new NotFoundException(FLIGHT_STATUS_NOT_FOUND);
        }

        const claim = (await this.claimService.getClaim(flightStatus.claimId))!;

        const flightCode = claim.details.flightNumber.slice(2);

        const airlineIcao = claim.details.airlines.icao;
        const flightDate = new Date(claim.details.date);
        let newFlightStatus: IFlightStatus | null;

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
        const claim = await this.claimService.getClaim(claimId);
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
