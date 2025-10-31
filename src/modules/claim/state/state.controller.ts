import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { StateDto } from './dto/state.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { StateService } from './state.service';
import { ClaimService } from '../claim.service';
import { IsAgentGuard } from '../../../guards/isAgent.guard';

@Controller('claims/state')
@UseGuards(JwtAuthGuard)
export class StateController {
    constructor(
        private readonly stateService: StateService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsAgentGuard)
    @Put('admin')
    async updateState(@Body() dto: StateDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        await this.claimService.changeUpdatedAt(claimId);

        return await this.stateService.updateState(dto, claimId);
    }
}
