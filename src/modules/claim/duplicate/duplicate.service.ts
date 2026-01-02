import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DuplicateService {
    constructor(private readonly prisma: PrismaService) {}

    async updateMany(claimIds: string[], duplicateId: string) {
        await this.prisma.duplicatedClaim.createMany({
            data: claimIds.map((claimId) => ({
                claimId: claimId,
                duplicatedClaimId: duplicateId,
            })),
            skipDuplicates: true,
        });
    }

    async getMany(claimId: string) {
        return this.prisma.duplicatedClaim.findMany({
            where: {
                claimId,
            },
        });
    }

    async deleteMany(claimIds: string[]) {
        if (!claimIds.length) return;

        await this.prisma.duplicatedClaim.deleteMany({
            where: {
                claimId: {
                    in: claimIds,
                },
            },
        });
    }
}
