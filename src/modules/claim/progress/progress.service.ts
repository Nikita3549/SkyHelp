import { Injectable } from '@nestjs/common';
import { IProgress } from '../interfaces/progress.interface';
import { Progress } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

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
}
