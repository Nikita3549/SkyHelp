import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ClaimRecentUpdatesStatus,
    ClaimRecentUpdatesType,
} from '@prisma/client';
import { ClaimService } from '../claim.service';
import { ActivityService } from '../activity/activity.service';
import { omit } from '../../../common/utils/omit';
import { FINAL_STEP } from '../constants';

@Injectable()
export class RecentUpdatesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimService: ClaimService,
        private readonly activityService: ActivityService,
    ) {}

    async saveRecentUpdate(
        recentUpdateData: {
            type: ClaimRecentUpdatesType;
            updatedEntityId: string;
            entityData: string; // document name for documents & fromEmail for emails
        },
        claimId: string,
    ) {
        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new InternalServerErrorException(
                'Invalid claimId while saving recent update',
            );
        }

        if (claim.step < FINAL_STEP) {
            return;
        }
        await this.saveActivity(
            {
                type: recentUpdateData.type,
                entityData: recentUpdateData.entityData,
            },
            claimId,
        );
        await this.claimService.updateHasRecentUpdate(true, claimId);

        await this.claimService.changeRecentUpdatedAt(claimId);

        return this.prisma.claimRecentUpdates.create({
            data: {
                claimId,
                ...omit(recentUpdateData, 'entityData'),
            },
        });
    }

    async unviewRecentUpdatesByClaimId(claimId: string) {
        return this.prisma.claimRecentUpdates.updateMany({
            data: {
                status: ClaimRecentUpdatesStatus.VIEWED,
            },
            where: {
                claimId,
            },
        });
    }

    private async saveActivity(
        data: { type: ClaimRecentUpdatesType; entityData: string },
        claimId: string,
    ) {
        let title: string;
        let description: string;
        switch (data.type) {
            case ClaimRecentUpdatesType.DOCUMENT:
                title = `Document uploaded`;
                description = `New document ${data.entityData} uploaded`;
                break;
            case ClaimRecentUpdatesType.EMAIL:
                title = `Receive email`;
                description = `New email from ${data.entityData}`;
                break;
        }

        await this.activityService.saveActivity(
            {
                type: data.type,
                title,
                description,
            },
            claimId,
        );
    }
}
