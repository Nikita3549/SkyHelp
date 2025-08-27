import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsAdminGuard } from '../../../guards/isAdminGuard';
import { FlightDto } from './dto/flight.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { DetailService } from './detail.service';
import { ClaimService } from '../claim.service';
import { IsAgentGuard } from '../../../guards/isAgent.guard';

@Controller('claims/details')
@UseGuards(JwtAuthGuard)
export class DetailController {
    constructor(
        private readonly detailService: DetailService,
        private readonly claimService: ClaimService,
    ) {}
    @UseGuards(IsAgentGuard)
    @Put('admin')
    async updateFlight(@Body() dto: FlightDto) {
        const { claimId } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimService.changeUpdatedAt(claim.id);

        return await this.detailService.updateDetails(dto, claim.id);
    }
}
