import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsModeratorGuard } from '../../../guards/isModerator.guard';
import { StateDto } from './dto/state.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { StateService } from './state.service';
import { ClaimService } from '../claim.service';

@Controller('claims/state')
@UseGuards(JwtAuthGuard)
export class StateController {
    constructor(
        private readonly stateService: StateService,
        private readonly claimService: ClaimService,
    ) {}
    @UseGuards(IsModeratorGuard)
    @Put('admin')
    async updateState(@Body() dto: StateDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimService.changeUpdatedAt(claimId);

        return await this.stateService.updateState(dto, claimId);
    }
}
