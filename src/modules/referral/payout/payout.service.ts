import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { PartnerService } from '../partner/partner.service';
import { NotificationService } from '../../notification/services/notification.service';
import { PartnerSettingsService } from '../partner/partner-settings/partner-settings.service';

@Injectable()
export class PayoutService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly partnerService: PartnerService,
        private readonly notificationService: NotificationService,
        private readonly partnerSettingsService: PartnerSettingsService,
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

                const partnerSettings =
                    await this.partnerSettingsService.getPartnerSettings(
                        partnerId,
                    );

                if (!partnerSettings) {
                    console.error(`Partner ${partnerId} has no settings`);
                    throw new InternalServerErrorException(`Logged error`);
                }

                if (partnerSettings.paymentAlerts) {
                    await this.notificationService.sendPartnerPayout(
                        partnerSettings.email,
                        {
                            amount,
                        },
                    );
                }

                return payout;
            },
        );

        return payout;
    }
}
