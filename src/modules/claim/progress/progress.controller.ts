import {
    Body,
    Controller,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { ProgressService } from './progress.service';
import { IsPartnerOrAgentGuard } from '../../../guards/isPartnerOrAgentGuard';
import { UNKNOWN_PROGRESS_VARIANT } from './constants';
import { StateService } from '../state/state.service';
import { ClaimService } from '../claim.service';
import { NotificationService } from '../../notification/notification.service';
import { Languages } from '../../language/enums/languages.enums';
import { isLanguage } from '../../../utils/isLanguage';
import { CreateProgressDto } from './dto/create-progress.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { ProgressVariants } from './constants/progresses/progressVariants';
import { ClaimStatus } from '@prisma/client';
import { enProgresses } from './constants/progresses/translations/en.json';

@Controller('claims/progresses')
@UseGuards(JwtAuthGuard, IsPartnerOrAgentGuard)
export class ProgressController {
    constructor(
        private readonly progressesService: ProgressService,
        private readonly stateService: StateService,
        private readonly claimService: ClaimService,
        private readonly notificationService: NotificationService,
    ) {}

    // @UseGuards(IsPartnerOrAgentGuard)
    // @Put(':progressId')
    // async updateProgress(
    //     @Body() dto: UpdateProgressDto,
    //     @Param('progressId') progressId: string,
    // ) {
    //     const progress =
    //         await this.progressesService.getProgressById(progressId);
    //
    //     if (!progress) {
    //         throw new NotFoundException(INVALID_PROGRESS_ID);
    //     }
    //
    //     const newProgress = await this.progressesService.updateProgress(
    //         {
    //             title: dto.title,
    //             description: dto.description,
    //             endAt: dto.endAt ? new Date(dto.endAt) : null,
    //             status: dto.status,
    //             order: dto.order,
    //         },
    //         progressId,
    //     );
    //
    //     if (
    //         progress.status != newProgress.status &&
    //         newProgress.status == ProgressStatus.COMPLETED
    //     ) {
    //         const claim = await this.claimService.getClaimByStateId(
    //             newProgress.claimStateId,
    //         );
    //
    //         if (!claim) {
    //             throw new InternalServerErrorException();
    //         }
    //
    //         const customerLanguage = isLanguage(claim.customer.language)
    //             ? claim.customer.language
    //             : Languages.EN;
    //
    //         this.notificationService.sendNewStatus(
    //             claim.customer.email,
    //             {
    //                 title: newProgress.title,
    //                 description: newProgress.description,
    //                 clientName: claim.customer.firstName,
    //                 claimId: claim.id,
    //             },
    //             customerLanguage,
    //         );
    //     }
    //
    //     return newProgress;
    // }

    @Post(':claimId')
    async createProgress(
        @Body() dto: CreateProgressDto,
        @Param('claimId') claimId: string,
    ) {
        const { status, order } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        const progressVariant = this.getProgressVariantByStatus(status, {
            claimId,
        });

        const progress = await this.progressesService.createProgressByClaimId(
            {
                title: progressVariant.title,
                description: progressVariant.description,
                order,
            },
            claim.stateId,
        );

        await this.stateService.updateStatus(
            progressVariant.status,
            progress.claimStateId,
        );

        const customerLanguage = isLanguage(claim.customer.language)
            ? claim.customer.language
            : Languages.EN;

        this.notificationService.sendNewStatus(
            claim.customer.email,
            {
                title: enProgresses[progress.title],
                description: enProgresses[progress.description],
                clientName: claim.customer.firstName,
                claimId: claim.id,
            },
            customerLanguage,
        );

        return progress;
    }

    private getProgressVariantByStatus(
        status: ClaimStatus,
        exceptionData: {
            claimId?: string;
        },
    ) {
        return ProgressVariants[
            (
                Object.keys(ProgressVariants) as Array<
                    keyof typeof ProgressVariants
                >
            ).find((key) => ProgressVariants[key].status == status) ||
                (() => {
                    const message = UNKNOWN_PROGRESS_VARIANT.replace(
                        '{{claimId}}',
                        exceptionData.claimId || '-',
                    );

                    console.error(message);
                    throw new InternalServerErrorException(message);
                })()
        ];
    }
}
