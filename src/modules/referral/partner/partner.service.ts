import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaimStatus, Partner, Prisma } from '@prisma/client';

@Injectable()
export class PartnerService {
    constructor(private readonly prisma: PrismaService) {}

    async createPartner(partnerData: {
        userId: string;
        userEmail: string;
        referralCode: string;
    }) {
        const settings = await this.prisma.partnerSettings.create({
            data: {
                email: partnerData.userEmail,
            },
        });

        return this.prisma.partner.create({
            data: {
                userId: partnerData.userId,
                referralCode: partnerData.referralCode,
                settingsId: settings.id,
            },
        });
    }

    async getPartnerByUserId(userId: string): Promise<Partner | null> {
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

    async getPartnerStats(userId: string) {
        const [
            clicksByDay,
            claimsByDay,
            approvedClaimsByDay,
            partnerEarnings,
            totalClicks,
            approvedClaimsCount,
            payoutsCount,
            claimsCount,
        ] = await this.prisma.$transaction([
            // clicks/day 30days back
            this.prisma.$queryRaw<{ date: string; count: number }[]>`
            SELECT TO_CHAR(rlc.date::date, 'DD-MM-YYYY') as date, SUM(rlc.clicks) as count FROM referral_links rl
                JOIN partners p ON p.id = rl.partner_id
                JOIN referral_link_clicks rlc ON rlc.link_id = rl.id
                WHERE p.user_id = ${userId} AND
                rlc.date >= NOW() - INTERVAL '30 days'
                GROUP BY rlc.date::date
                ORDER BY rlc.date::date DESC;
            `,

            // claims/day 30days back
            this.prisma.$queryRaw<{ date: string; count: number }[]>`
                SELECT TO_CHAR(c.created_at::date, 'DD-MM-YYYY') as date, COUNT(c) as count FROM claims c
                  JOIN partners p ON p.id = c.referred_by_id
                  WHERE p.user_id = ${userId} AND
                  c.created_at >= NOW() - INTERVAL '30 days'
                  GROUP BY c.created_at::date
                  ORDER BY c.created_at::date DESC
            `,

            // approved claims/day 30days back
            this.prisma.$queryRaw<{ date: string; count: number }[]>`
            SELECT TO_CHAR(c.created_at::date, 'DD-MM-YYYY') as date, COUNT(c) as count FROM claims c
                JOIN partners p ON p.id = c.referred_by_id
                JOIN claim_states cs ON c.state_id = cs.id
                WHERE p.user_id = ${userId} AND
                c.created_at >= NOW() - INTERVAL '30 days' AND
                cs.status = 'Paid'
                GROUP BY c.created_at::date
                ORDER BY c.created_at::date DESC`,

            // total revenue
            this.prisma.partner.findUniqueOrThrow({
                where: {
                    userId: userId,
                },
                select: {
                    totalEarnings: true,
                },
            }),

            // clicks on links
            this.prisma.referralLinkClick.aggregate({
                where: {
                    link: {
                        partner: {
                            userId,
                        },
                    },
                },
                _sum: {
                    clicks: true,
                },
            }),

            // approved claims
            this.prisma.claim.count({
                where: {
                    state: {
                        status: ClaimStatus.PAID,
                    },
                    referredBy: {
                        userId,
                    },
                },
            }),

            // payouts count
            this.prisma.referralPayout.count({
                where: {
                    partner: {
                        userId,
                    },
                },
            }),

            // claims count
            this.prisma.claim.count({
                where: {
                    referredBy: {
                        userId,
                    },
                },
            }),
        ]);

        return {
            clicksByDay: clicksByDay.map((row) => ({
                date: row.date,
                count: Number(row.count),
            })),
            claimsByDay: claimsByDay.map((row) => ({
                date: row.date,
                count: Number(row.count),
            })),
            approvedClaimsByDay: approvedClaimsByDay.map((row) => ({
                date: row.date,
                count: Number(row.count),
            })),
            totalRevenue: partnerEarnings.totalEarnings,
            totalClicks: totalClicks._sum.clicks ?? 0,
            approvedClaimsCount,
            payoutsCount,
            claimsCount,
        };
    }
}
