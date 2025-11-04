import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PartnerService } from '../partner/partner.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class ReferralTransactionService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly partnerService: PartnerService,
    ) {}

    async makeReferralTransaction(
        data: {
            claimId: string;
            amount: number;
            referralCode: string;
        },
        tx?: Prisma.TransactionClient,
    ) {
        const { amount, referralCode, claimId } = data;

        const partner =
            await this.partnerService.getPartnerByReferralCode(referralCode);

        if (!partner) {
            return;
        }

        const execute = async (tx: Prisma.TransactionClient) => {
            await tx.referralTransaction.create({
                data: {
                    claimId,
                    partnerId: partner.id,
                    amount,
                },
            });

            await this.partnerService.increaseBalance(amount, partner.id, tx);
        };

        if (tx) {
            await execute(tx);
        } else {
            await this.prisma.$transaction(execute);
        }
    }

    async getReferralTransactionByClaimId(claimId: string) {
        return this.prisma.referralTransaction.findFirst({
            where: {
                claimId,
            },
        });
    }
}
