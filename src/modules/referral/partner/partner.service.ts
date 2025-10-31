import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Partner, Prisma } from '@prisma/client';

@Injectable()
export class PartnerService {
    constructor(private readonly prisma: PrismaService) {}

    async createPartner(partnerData: { userId: string; referralCode: string }) {
        return this.prisma.partner.create({
            data: {
                userId: partnerData.userId,
                referralCode: partnerData.referralCode,
            },
        });
    }

    async getPartnerByUserId(userId: string): Promise<Partner | null> {
        console.log('userId', userId);
        return this.prisma.partner.findFirst({
            where: {
                userId,
            },
        });
    }

    async increaseBalance(
        amount: number,
        partnerId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const client = tx ?? this.prisma;

        return client.partner.update({
            data: {
                balance: {
                    increment: Prisma.Decimal(amount),
                },
                totalEarnings: {
                    increment: Prisma.Decimal(amount),
                },
            },
            where: { id: partnerId },
        });
    }

    async decreaseBalance(
        amount: number,
        partnerId: string,
        tx?: Prisma.TransactionClient,
    ) {
        const client = tx ?? this.prisma;

        return client.partner.update({
            data: {
                balance: {
                    decrement: Prisma.Decimal(amount),
                },
            },
            where: { id: partnerId },
        });
    }

    async getPartnerByReferralCode(
        referralCode: string,
    ): Promise<Partner | null> {
        return this.prisma.partner.findFirst({
            where: {
                referralCode,
            },
        });
    }
}
