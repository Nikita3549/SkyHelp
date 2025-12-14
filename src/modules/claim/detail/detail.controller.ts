import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { FlightDto } from './dto/flight.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { DetailService } from './detail.service';
import { ClaimService } from '../claim.service';
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../../common/guards/role.guard';
import { DocumentService } from '../document/services/document.service';

@Controller('claims/details')
@UseGuards(JwtAuthGuard)
export class DetailController {
    constructor(
        private readonly detailService: DetailService,
        private readonly claimService: ClaimService,
        private readonly documentService: DocumentService,
    ) {}

    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    @Put('admin')
    async updateFlight(@Body() dto: FlightDto) {
        const { claimId } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        const details = await this.detailService.updateDetails(dto, claim.id);

        await this.claimService.changeUpdatedAt(claim.id);
        await this.documentService.updateAssignmentData(claim.id, [
            ...claim.passengers.map((p) => p.id),
            claim.customer.id,
        ]);

        return details;
    }
}
