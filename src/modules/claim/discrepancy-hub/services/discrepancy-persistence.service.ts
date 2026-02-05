import { Injectable, NotFoundException } from '@nestjs/common';
import {
    ClaimDiscrepancy,
    ClaimDiscrepancyFieldName,
    ClaimDiscrepancyStatus,
} from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class DiscrepancyPersistenceService {
    constructor(private readonly prisma: PrismaService) {}

    async saveDiscrepancy(data: {
        fieldName: ClaimDiscrepancyFieldName;
        passengerId: string;
        documentId: string;
        extractedValue: string;
        claimId: string;
    }): Promise<ClaimDiscrepancy> {
        return this.prisma.claimDiscrepancy.create({
            data: {
                fieldName: data.fieldName,
                passengerId: data.passengerId,
                documentId: data.documentId,
                extractedValue: data.extractedValue,
                claimId: data.claimId,
            },
        });
    }

    async updateStatus(
        status: ClaimDiscrepancyStatus,
        discrepancyId: string,
    ): Promise<ClaimDiscrepancy> {
        const discrepancy = await this.findOne(discrepancyId);

        if (!discrepancy) {
            throw new NotFoundException('Discrepancy entity not fount');
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
