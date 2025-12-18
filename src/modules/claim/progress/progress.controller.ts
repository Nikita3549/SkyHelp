import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    HttpCode,
    NotFoundException,
    Param,
    Patch,
    Post,
    Req,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { ProgressService } from './progress.service';
import {
    PROGRESS_NOT_FOUND,
    SEND_NEW_PROGRESS_EMAIL_QUEUE_DELAY,
    SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY,
} from './constants';
import { ClaimService } from '../claim.service';
import { Languages } from '../../language/enums/languages.enums';
import { isLanguage } from '../../../common/utils/isLanguage';
import { CreateProgressDto } from './dto/create-progress.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { ProgressVariants } from './constants/progresses/progressVariants';
import { ClaimStatus, UserRole } from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ISendNewProgressEmailJobData } from './interfaces/send-new-progress-email-job-data.interface';
import { HttpStatusCode } from 'axios';
import { LanguageService } from '../../language/language.service';
import { AuthRequest } from '../../../common/interfaces/AuthRequest.interface';
import { MINUTE } from '../../../common/constants/time.constants';
import { UpdateProgressComments } from './dto/update-progress-comments';
import { RoleGuard } from '../../../common/guards/role.guard';

@Controller('claims/progresses')
@UseGuards(
    JwtAuthGuard,
    new RoleGuard([
        UserRole.ADMIN,
        UserRole.LAWYER,
        UserRole.AGENT,
        UserRole.PARTNER,
        UserRole.ACCOUNTANT,
    ]),
)
export class ProgressController {
    constructor(
        private readonly progressesService: ProgressService,
        private readonly claimService: ClaimService,
        @InjectQueue(SEND_NEW_PROGRESS_EMAIL_QUEUE_KEY)
        private readonly sendNewProgressEmailQueue: Queue,
        private readonly languageService: LanguageService,
    ) {}

    @Post(':claimId')
    async createProgress(
        @Body() dto: CreateProgressDto,
        @Param('claimId') claimId: string,
        @Req() req: AuthRequest,
    ) {
        const { status, order, description, comments, additionalData } = dto;
        const user = req.user;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const customerLanguage = isLanguage(claim.customer.language)
            ? claim.customer.language
            : Languages.EN;

        const translations =
            await this.languageService.getTranslationsJson(customerLanguage);
        let translatedDescription = translations[description] || description;
        if (additionalData) {
            Object.keys(additionalData).forEach((key) => {
                translatedDescription = translatedDescription.replaceAll(
                    `{{${key}}}`,
                    additionalData[key],
                );
            });
        }

        const progressVariant = this.getProgressVariantByStatus(
            status,
            description,
        );

        const progress = await this.progressesService.createProgress(
            {
                title: progressVariant.title,
                description,
                order,
                updatedBy: user.id,
                comments,
                descriptionVariables: additionalData
                    ? Object.keys(additionalData).map((key) => ({
                          key,
                          value: additionalData[key],
                      }))
                    : [],
            },
            claim.stateId,
        );

        let translatedTitle = translations[progress.title] || progress.title;

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
            referralCode: claim.referrer,
            newClaimStatus: progressVariant.status,
        };

        await this.sendNewProgressEmailQueue.add(
            'sendNewProgressEmail',
            jobData,
            {
                delay: SEND_NEW_PROGRESS_EMAIL_QUEUE_DELAY,
                attempts: 3,
                backoff: { type: 'exponential', delay: 5000 },
            },
        );

        return progress;
    }

    @Patch(':progressId/comments')
    async updateProgressComments(
        @Body() dto: UpdateProgressComments,
        @Param('progressId') progressId: string,
    ) {
        const { comments } = dto;

        const progress =
            await this.progressesService.getProgressById(progressId);

        if (!progress) {
            throw new NotFoundException(PROGRESS_NOT_FOUND);
        }

        return this.progressesService.updateComments(comments, progressId);
    }

    @Delete(':progressId')
    @HttpCode(HttpStatusCode.NoContent)
    async deleteProgress(@Param('progressId') progressId: string) {
        const progress =
            await this.progressesService.getProgressById(progressId);

        if (!progress) {
            throw new NotFoundException(PROGRESS_NOT_FOUND);
        }

        if (
            Date.now() - progress.createdAt.getTime() >
            SEND_NEW_PROGRESS_EMAIL_QUEUE_DELAY
        ) {
            throw new ForbiddenException(
                `You cannot delete a progress step after ${SEND_NEW_PROGRESS_EMAIL_QUEUE_DELAY / MINUTE} minutes of its creation`,
            );
        }

        await this.progressesService.deleteProgress(progressId);
    }

    private getProgressVariantByStatus(
        status: ClaimStatus,
        description: string,
    ) {
        return ProgressVariants[
            (
                Object.keys(ProgressVariants) as Array<
                    keyof typeof ProgressVariants
                >
            ).find(
                (key) =>
                    ProgressVariants[key].status == status &&
                    ProgressVariants[key].descriptions.includes(description),
            ) ||
                (() => {
                    throw new BadRequestException(
                        'Invalid progress description',
                    );
                })()
        ];
    }
}
