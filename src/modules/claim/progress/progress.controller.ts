import {
    Body,
    Controller,
    InternalServerErrorException,
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
import { ClaimService } from '../claim.service';
import { NotificationService } from '../../notification/notification.service';
import { Languages } from '../../language/enums/languages.enums';
import { isLanguage } from '../../../utils/isLanguage';

@Controller('claims/progresses')
@UseGuards(JwtAuthGuard)
export class ProgressController {
    constructor(
        private readonly progressesService: ProgressService,
        private readonly stateService: StateService,
        private readonly claimService: ClaimService,
        private readonly notificationService: NotificationService,
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

            const claim = await this.claimService.getClaimByStateId(
                newProgress.claimStateId,
            );

            if (!claim) {
                throw new InternalServerErrorException();
            }

            const customerLanguage = isLanguage(claim.customer.language)
                ? claim.customer.language
                : Languages.EN;

            this.notificationService.sendNewStatus(
                claim.customer.email,
                {
                    title: newProgress.title,
                    description: newProgress.description,
                    clientName: claim.customer.firstName,
                    claimId: claim.id,
                },
                customerLanguage,
            );
        }

        return newProgress;
    }
}
