import { Injectable } from '@nestjs/common';
import { IProgress } from '../interfaces/progress.interface';
import { Progress, ProgressStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProgressDto } from './dto/create-progress.dto';
import { omit } from '../../../utils/omit';

@Injectable()
export class ProgressService {
    constructor(private readonly prisma: PrismaService) {}

    async updateProgress(
        progress: IProgress,
        progressId: string,
    ): Promise<Progress> {
        return this.prisma.progress.update({
            data: progress,
            where: {
                id: progressId,
            },
        });
    }

    async getProgressById(progressId: string): Promise<Progress | null> {
        return this.prisma.progress.findFirst({
            where: {
                id: progressId,
            },
        });
    }

    async createProgressByClaimId(
        progress: CreateProgressDto,
        claimStateId: string,
    ) {
        return this.prisma.progress.create({
            data: {
                ...omit(progress, 'validatePair'),
                claimStateId,
                endAt: new Date(),
                status: ProgressStatus.COMPLETED,
            },
        });
    }
}
