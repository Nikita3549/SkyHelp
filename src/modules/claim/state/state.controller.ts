import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { StateDto } from './dto/state.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { StateService } from './state.service';
import { ClaimService } from '../claim.service';
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../../common/guards/role.guard';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';

@Controller('claims/state')
@UseGuards(JwtAuthGuard)
export class StateController {
    constructor(
        private readonly stateService: StateService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @UseGuards(
        new RoleGuard([UserRole.ADMIN, UserRole.AGENT, UserRole.ACCOUNTANT]),
    )
    @Put('admin')
    async updateState(@Body() dto: StateDto) {
        const { claimId } = dto;

        if (!(await this.claimPersistenceService.findOneById(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        await this.claimPersistenceService.update(
            { updatedAt: new Date() },
            claimId,
        );

        return await this.stateService.updateState(dto, claimId);
    }
}
