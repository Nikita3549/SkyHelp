import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class EmailResumeClickService {
    constructor(private readonly prisma: PrismaService) {}

    async createRecord(claimId: string) {
        return this.prisma.emailResumeClick.createMany({
            data: [
                {
                    claimId,
                },
            ],
            skipDuplicates: true,
        });
    }

    async getRecordByClaimId(claimId: string) {
        return this.prisma.emailResumeClick.findFirst({
            where: {
                claimId,
            },
        });
    }

    async saveClick(claimId: string) {
        return this.prisma.emailResumeClick.update({
            where: {
                claimId,
            },
            data: {
                isClicked: true,
            },
        });
    }

    async getStats(): Promise<{ total: number; clicked: number }> {
        const [total, clicked] = await this.prisma.$transaction([
            this.prisma.emailResumeClick.count(),
            this.prisma.emailResumeClick.count({
                where: {
                    isClicked: true,
                },
            }),
        ]);

        return {
            total,
            clicked,
        };
    }
}
