import {
    Body,
    Controller,
    Delete,
    HttpCode,
    InternalServerErrorException,
    NotFoundException,
    Param,
    Post,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { ProgressService } from './progress.service';
import { IsPartnerOrAgentGuard } from '../../../guards/isPartnerOrAgentGuard';
import {
    INVALID_PROGRESS_ID,
    SEND_NEW_PROGRESS_EMAIL_QUEUE_DELAY,
    SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY,
    UNKNOWN_PROGRESS_VARIANT,
} from './constants';
import { StateService } from '../state/state.service';
import { ClaimService } from '../claim.service';
import { Languages } from '../../language/enums/languages.enums';
import { isLanguage } from '../../../utils/isLanguage';
import { CreateProgressDto } from './dto/create-progress.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { ProgressVariants } from './constants/progresses/progressVariants';
import { ClaimStatus } from '@prisma/client';
import { enProgresses } from './constants/progresses/translations/en';
import { ruProgresses } from './constants/progresses/translations/ru';
import { tyProgresses } from './constants/progresses/translations/ty';
import { roProgresses } from './constants/progresses/translations/ro';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ISendNewProgressEmailJobData } from './interfaces/send-new-progress-email-job-data.interface';
import { HttpStatusCode } from 'axios';

@Controller('claims/progresses')
@UseGuards(JwtAuthGuard, IsPartnerOrAgentGuard)
export class ProgressController {
    constructor(
        private readonly progressesService: ProgressService,
        private readonly claimService: ClaimService,
        @InjectQueue(SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY)
        private readonly sendNewProgressEmailQueue: Queue,
    ) {}

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

        const customerLanguage = isLanguage(claim.customer.language)
            ? claim.customer.language
            : Languages.EN;

        let translatedTitle: string;
        let translatedDescription: string;

        switch (customerLanguage) {
            case Languages.RU:
                translatedTitle = ruProgresses[progress.title];
                translatedDescription = ruProgresses[progress.description];
                break;
            case Languages.RO:
                translatedTitle = roProgresses[progress.title];
                translatedDescription = roProgresses[progress.description];
                break;
            case Languages.TY:
                translatedTitle = tyProgresses[progress.title];
                translatedDescription = tyProgresses[progress.description];
                break;
            default:
                translatedTitle = enProgresses[progress.title];
                translatedDescription = enProgresses[progress.description];
                break;
        }

        const jobData: ISendNewProgressEmailJobData = {
            progressId: progress.id,
            emailData: {
                to: claim.customer.email,
                title: translatedTitle,
                description: translatedDescription,
                clientName: claim.customer.firstName,
                claimId: claim.id,
                language: customerLanguage,
            },
            newClaimStatus: status,
        };

        await this.sendNewProgressEmailQueue.add(
            'sendNewProgressEmail',
            jobData,
            {
                delay: SEND_NEW_PROGRESS_EMAIL_QUEUE_DELAY,
                attempts: 1,
            },
        );

        return progress;
    }

    @Delete(':progressId')
    @HttpCode(HttpStatusCode.NoContent)
    async deleteProgress(@Param('progressId') progressId: string) {
        const progress =
            await this.progressesService.getProgressById(progressId);

        if (!progress) {
            throw new NotFoundException(INVALID_PROGRESS_ID);
        }

        await this.progressesService.deleteProgress(progressId);
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
