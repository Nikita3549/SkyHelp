import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ClaimRecentUpdatesStatus,
    ClaimRecentUpdatesType,
} from '@prisma/client';
import { ClaimService } from '../claim.service';

@Injectable()
export class RecentUpdatesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimService: ClaimService,
    ) {}

    async saveRecentUpdate(
        recentUpdateData: {
            type: ClaimRecentUpdatesType;
            updatedEntityId: string;
        },
        claimId: string,
    ) {
        await this.claimService.updateHasRecentUpdate(true, claimId);

        return this.prisma.claimRecentUpdates.create({
            data: {
                claimId,
                ...recentUpdateData,
            },
        });
    }

    async unviewRecentUpdatesByClaimId(claimId: string) {
        return this.prisma.claimRecentUpdates.updateMany({
            data: {
                status: ClaimRecentUpdatesStatus.UNVIEWED,
            },
            where: {
                claimId,
            },
        });
    }
}
