import {
    Body,
    Controller,
    NotFoundException,
    Param,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { UpdateProgressDto } from './dto/update-progress.dto';
import { ProgressService } from './progress.service';
import { IsPartnerOrAgentGuard } from '../../../guards/isPartnerOrAgentGuard';
import { INVALID_PROGRESS_ID } from './constants';
import { ClaimStatus, ProgressStatus } from '@prisma/client';
import { StateService } from '../state/state.service';
import { Progresses } from './constants/progresses';

@Controller('claims/progresses')
@UseGuards(JwtAuthGuard)
export class ProgressController {
    constructor(
        private readonly progressesService: ProgressService,
        private readonly stateService: StateService,
    ) {}

    @UseGuards(IsPartnerOrAgentGuard)
    @Put(':progressId')
    async updateProgress(
        @Body() dto: UpdateProgressDto,
        @Param('progressId') progressId: string,
    ) {
        const progress =
            await this.progressesService.getProgressById(progressId);

        if (!progress) {
            throw new NotFoundException(INVALID_PROGRESS_ID);
        }

        const newProgress = await this.progressesService.updateProgress(
            {
                title: dto.title,
                description: dto.description,
                endAt: dto.endAt ? new Date(dto.endAt) : null,
                status: dto.status,
                order: dto.order,
            },
            progressId,
        );

        if (
            progress.status != newProgress.status &&
            newProgress.status == ProgressStatus.COMPLETED
        ) {
            if (newProgress.title == 'Documents Verified') {
                await this.stateService.updateStatus(
                    ClaimStatus.IN_PROGRESS,
                    progress.claimStateId,
                );
            }

            if (newProgress.title == 'Claim Completed') {
                await this.stateService.updateStatus(
                    ClaimStatus.COMPLETED,
                    progress.claimStateId,
                );
            }
        }

        return newProgress;
    }
}
