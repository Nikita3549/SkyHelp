import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PartnerService } from '../partner/partner.service';

@Injectable()
export class PayoutService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly partnerService: PartnerService,
    ) {}

    async getPayouts(filters: { userId?: string }) {
        return this.prisma.referralPayout.findMany({
            where: {
                partner: {
                    user: {
                        id: filters.userId,
                    },
                },
            },
        });
    }

    async makePayout(data: { amount: number; partnerId: string }) {
        const { amount, partnerId } = data;

        const payout = await this.prisma.$transaction(
            async (tx: Prisma.TransactionClient) => {
                const payout = await tx.referralPayout.create({
                    data: {
                        amount: Prisma.Decimal(amount),
                        partnerId,
                    },
                });

                await this.partnerService.decreaseBalance(
                    amount,
                    partnerId,
                    tx,
                );

                return payout;
            },
        );

        return payout;
    }
}
