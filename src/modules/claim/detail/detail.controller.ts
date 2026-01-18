import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    HttpCode,
    HttpStatus,
    Param,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { CLAIM_NOT_FOUND } from '../constants';
import { DetailService } from './detail.service';
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../../common/guards/role.guard';
import { DocumentService } from '../document/services/document.service';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';
import { UpdateDetailsDto } from './dto/update-details.dto';

@Controller('claims/details')
@UseGuards(JwtAuthGuard)
export class DetailController {
    constructor(
        private readonly detailService: DetailService,
        private readonly documentService: DocumentService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
    @Put('admin')
    async updateDetails(@Body() dto: UpdateDetailsDto) {
        const { claimId } = dto;

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        const details = await this.detailService.updateDetails(dto, claim.id);

        await this.claimPersistenceService.update(
            { updatedAt: new Date() },
            claimId,
        );
        await this.documentService.updateAssignmentData(claim.id, [
            ...claim.passengers.map((p) => p.id),
            claim.customer.id,
        ]);

        return details;
    }

    @Delete(':routeId/route')
    @HttpCode(HttpStatus.NO_CONTENT)
    async deleteRoute(@Param('routeId') routeId: string) {
        await this.detailService.deleteRoute(routeId);
    }
}
