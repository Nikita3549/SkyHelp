import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post,
    Query,
    UseGuards,
} from '@nestjs/common';
import { IMeteoData } from './interfaces/metar-data.interfaces';
import { MeteoStatusService } from './meteo-status.service';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { UserRole } from '@prisma/client';
import { METEO_STATUS_NOT_FOUND } from './constants';
import { GenerateMeteoStatusDto } from './dto/generate-meteo-status.dto';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';
import { CLAIM_NOT_FOUND } from '../constants';

@Controller('claims/:claimId/meteo-status')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([
        UserRole.ADMIN,
        UserRole.AGENT,
        UserRole.LAWYER,
        UserRole.ACCOUNTANT,
    ]),
)
export class MeteoStatusController {
    constructor(
        private readonly meteoStatusService: MeteoStatusService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @Get('fetch')
    async generateMeteoStatus(
        @Query() dto: GenerateMeteoStatusDto,
        @Param('claimId') claimId: string,
    ): Promise<IMeteoData> {
        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const troubledRoute =
            claim.details.routes.find((r) => r.troubled) ||
            claim.details.routes[0];

        const meteoStatus = await this.meteoStatusService.fetchMeteoStatus({
            airportIcao: troubledRoute.DepartureAirport.icao,
            time: dto.time,
        });

        if (!meteoStatus) {
            throw new NotFoundException(METEO_STATUS_NOT_FOUND);
        }

        return meteoStatus;
    }

    @Get()
    async getMeteoStatus(
        @Param('claimId') claimId: string,
    ): Promise<IMeteoData> {
        const meteoStatus = await this.meteoStatusService.getByClaimId(claimId);

        if (!meteoStatus) {
            throw new NotFoundException(METEO_STATUS_NOT_FOUND);
        }

        return meteoStatus;
    }
}
