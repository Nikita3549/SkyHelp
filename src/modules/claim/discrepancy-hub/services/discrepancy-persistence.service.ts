import { Injectable, NotFoundException } from '@nestjs/common';
import {
    ClaimDiscrepancy,
    ClaimDiscrepancyFieldName,
    ClaimDiscrepancyStatus,
    DiscrepancyType,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { DISCREPANCY_NOT_FOUND } from '../constants';

@Injectable()
export class DiscrepancyPersistenceService {
    constructor(private readonly prisma: PrismaService) {}

    async saveDiscrepancy(data: {
        fieldName?: ClaimDiscrepancyFieldName;
        passengerId: string;
        documentIds: string[];
        extractedValue: string;
        claimId: string;
        type: DiscrepancyType;
    }): Promise<ClaimDiscrepancy> {
        return this.prisma.claimDiscrepancy.create({
            data: {
                fieldName: data.fieldName,
                passengerId: data.passengerId,
                documentIds: data.documentIds,
                documentId: data.documentIds[0], //temporary
                extractedValue: data.extractedValue,
                claimId: data.claimId,
                type: data.type,
            },
        });
    }

    async updateStatusByDocumentId(
        status: ClaimDiscrepancyStatus,
        documentId: string,
    ) {
        if (!documentId) {
            return;
        }

        await this.prisma.claimDiscrepancy.updateMany({
            data: {
                status,
            },
            where: {
                documentId,
            },
        });
    }

    async updateStatus(
        status: ClaimDiscrepancyStatus,
        discrepancyId: string,
    ): Promise<ClaimDiscrepancy> {
        const discrepancy = await this.findOne(discrepancyId);

        if (!discrepancy) {
            throw new NotFoundException(DISCREPANCY_NOT_FOUND);
        }

        return this.prisma.claimDiscrepancy.update({
            data: {
                status,
            },
            where: {
                id: discrepancyId,
            },
        });
    }

    async findOne(discrepancyId: string): Promise<ClaimDiscrepancy | null> {
        return this.prisma.claimDiscrepancy.findFirst({
            where: {
                id: discrepancyId,
            },
        });
    }
}
