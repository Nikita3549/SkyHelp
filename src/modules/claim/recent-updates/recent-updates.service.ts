import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaimRecentUpdatesType } from '@prisma/client';

@Injectable()
export class RecentUpdatesService {
    constructor(private readonly prisma: PrismaService) {}

    async saveRecentUpdate(
        recentUpdateData: {
            type: ClaimRecentUpdatesType;
            updatedEntityId: string;
        },
        claimId: string,
    ) {
        return this.prisma.claimRecentUpdates.create({
            data: {
                claimId,
                ...recentUpdateData,
            },
        });
    }
}
