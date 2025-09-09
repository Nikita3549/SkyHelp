import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaimActivity, ClaimActivityType, Prisma } from '@prisma/client';

@Injectable()
export class ActivityService {
    constructor(private readonly prisma: PrismaService) {}

    async saveActivity(
        activityData: {
            title: string;
            description: string;
            type: ClaimActivityType;
        },
        claimId: string,
    ) {
        return this.prisma.claimActivity.create({
            data: {
                ...activityData,
                claimId,
            },
        });
    }

    async getActivities(
        page: number,
        searchData: {
            claimId?: string;
        },
        pageSize: number = 20,
    ): Promise<ClaimActivity[]> {
        const skip = (page - 1) * pageSize;

        const where: Prisma.ClaimActivityWhereInput = {};

        if (searchData?.claimId) {
            where.claimId = searchData.claimId;
        }

        return this.prisma.claimActivity.findMany({
            where,
            skip,
        });
    }
}
