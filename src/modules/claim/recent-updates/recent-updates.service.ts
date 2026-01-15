import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ClaimActivityType,
    ClaimRecentUpdatesStatus,
    ClaimRecentUpdatesType,
    DocumentType,
} from '@prisma/client';
import { ActivityService } from '../activity/activity.service';
import { FINAL_STEP } from '../constants';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';

@Injectable()
export class RecentUpdatesService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly activityService: ActivityService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    async saveRecentUpdate(
        recentUpdateData: {
            type: ClaimRecentUpdatesType;
            documentType?: DocumentType;
            updatedEntityId: string;
            entityData: string; // document name for documents & fromEmail for emails
        },
        claimId: string,
    ) {
        const documentType = recentUpdateData?.documentType;
        if (documentType && documentType == DocumentType.PASSENGER_PAYOUT) {
            return;
        }

        const claim = await this.claimPersistenceService.findOneById(claimId);

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
                documentType: recentUpdateData.documentType,
            },
            claimId,
        );
        await this.claimPersistenceService.updateHasRecentUpdate(
            { hasRecentUpdate: true },
            claimId,
        );

        await this.claimPersistenceService.update(
            { recentUpdatedAt: new Date() },
            claimId,
        );

        return this.prisma.claimRecentUpdates.create({
            data: {
                claimId,
                type: recentUpdateData.type,
                updatedEntityId: recentUpdateData.updatedEntityId,
            },
        });
    }

    async markRecentUpdatesAsViewed(claimId: string) {
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
        data: {
            type: ClaimRecentUpdatesType;
            entityData: string;
            documentType?: DocumentType;
        },
        claimId: string,
    ) {
        let title: string;
        let description: string;
        let activityType: ClaimActivityType;
        switch (data.type) {
            case ClaimRecentUpdatesType.DOCUMENT:
                switch (data.documentType) {
                    case DocumentType.ASSIGNMENT:
                        title = `Assignment uploaded`;
                        description = `New assignment ${data.entityData} uploaded`;
                        activityType = ClaimActivityType.ASSIGNMENT;
                        break;
                    case DocumentType.BOARDING_PASS:
                        title = `Boarding pass uploaded`;
                        description = `New boarding pass ${data.entityData} uploaded`;
                        activityType = ClaimActivityType.BOARDING_PASS;
                        break;
                    case DocumentType.ETICKET:
                        title = `E-ticket uploaded`;
                        description = `New boarding pass ${data.entityData} uploaded`;
                        activityType = ClaimActivityType.ETICKET;
                        break;
                    case DocumentType.PASSPORT:
                        title = `Passport uploaded`;
                        description = `New passport ${data.entityData} uploaded`;
                        activityType = ClaimActivityType.PASSPORT;
                        break;
                    case DocumentType.AIRLINE_PAYMENT:
                        return;
                    case DocumentType.PASSENGER_PAYOUT:
                        return;
                    default:
                        title = `Document uploaded`;
                        description = `New document ${data.entityData} uploaded`;
                        activityType = ClaimActivityType.DOCUMENT;
                }
                break;
            case ClaimRecentUpdatesType.EMAIL:
                title = `Email received`;
                description = `New email from ${data.entityData}`;
                activityType = ClaimActivityType.EMAIL;
                break;
        }

        await this.activityService.saveActivity(
            {
                type: activityType,
                title,
                description,
            },
            claimId,
        );
    }
}
