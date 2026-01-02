import { Injectable } from '@nestjs/common';
import { ClaimStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClaimStatsService {
    constructor(private readonly prisma: PrismaService) {}

    async getClaimsStats(
        userId?: string,
        agentId?: string,
        dateFilter?: { dateFrom: Date; dateTo: Date },
    ): Promise<{
        total: number;
        paid: number;
        approved: number;
        active: number;
        completedAmount: number;
        claimsByDay: { date: string; count: number }[];
        successByMonth: { month: string; success: string }[];
        airlines: { count: number; name: string; icao: string }[];
    }> {
        const dateWhere = dateFilter
            ? { gte: dateFilter.dateFrom, lte: dateFilter.dateTo }
            : undefined;

        const [
            total,
            paid,
            approved,
            active,
            completedAmountAgg,
            claimsByDay,
            successByMonth,
        ] = await this.prisma.$transaction([
            // total claims
            this.prisma.claim.count({
                where: {
                    userId,
                    agentId,
                    archived: false,
                    ...(dateWhere ? { createdAt: dateWhere } : {}),
                },
            }),

            // paid claims
            this.prisma.claim.count({
                where: {
                    userId,
                    agentId,
                    archived: false,
                    state: { status: ClaimStatus.PAID },
                    ...(dateWhere ? { createdAt: dateWhere } : {}),
                },
            }),

            // approved claims
            this.prisma.claim.count({
                where: {
                    userId,
                    agentId,
                    archived: false,
                    state: { status: ClaimStatus.APPROVED },
                    ...(dateWhere ? { createdAt: dateWhere } : {}),
                },
            }),

            // active claims
            this.prisma.claim.count({
                where: {
                    userId,
                    agentId,
                    archived: false,
                    state: {
                        status: {
                            notIn: [
                                ClaimStatus.PAID,
                                ClaimStatus.CLOSED,
                                ClaimStatus.NOT_ELIGIBLE,
                            ],
                        },
                    },
                    ...(dateWhere ? { createdAt: dateWhere } : {}),
                },
            }),

            // sum of ClaimState.amount where state.status = PAID
            this.prisma.claimState.aggregate({
                where: {
                    status: ClaimStatus.PAID,
                    Claim: {
                        some: {
                            userId,
                            agentId,
                            archived: false,
                            ...(dateWhere ? { createdAt: dateWhere } : {}),
                        },
                    },
                },
                _sum: { amount: true },
            }),

            // claims/day
            this.prisma.$queryRaw<{ date: string; count: number }[]>`
                SELECT TO_CHAR(c."created_at"::date, 'DD.MM.YYYY') AS date, COUNT(*) AS count
                FROM "claims" c
                WHERE ${userId ? Prisma.sql`c."user_id" = ${userId} AND` : Prisma.empty}
                      ${agentId ? Prisma.sql`c."agent_id" = ${agentId} AND` : Prisma.empty}
                    c."archived" = false
                      ${dateFilter ? Prisma.sql`AND c."created_at" >= ${dateFilter.dateFrom} AND c."created_at" <= ${dateFilter.dateTo}` : Prisma.empty}
                GROUP BY c."created_at"::date
                ORDER BY c."created_at"::date DESC
            `,

            // success claims by month
            this.prisma.$queryRaw<{ month: string; success: number }[]>`
                  SELECT TO_CHAR(c."created_at", 'Mon') AS month, COUNT(*) AS success
                  FROM "claims" c
                      INNER JOIN "claim_states" s
                  ON c."state_id" = s."id"
                  WHERE s."status" = 'COMPLETED' ${userId ? Prisma.sql`AND c."user_id" = ${userId}` : Prisma.empty} ${agentId ? Prisma.sql`AND c."agent_id" = ${agentId}` : Prisma.empty}
                    AND c."archived" = false ${dateFilter ? Prisma.sql`AND c."created_at" >= ${dateFilter.dateFrom} AND c."created_at" <= ${dateFilter.dateTo}` : Prisma.empty}
                  GROUP BY month, date_trunc('month', c."created_at")
                  ORDER BY date_trunc('month', c."created_at") DESC`,
        ]);

        // airlines
        const airlines = await this.prisma.airline.groupBy({
            by: ['name', 'icao'],
            _count: { _all: true },
            where: {
                Details: {
                    some: {
                        Claim: {
                            some: {
                                archived: false,
                            },
                        },
                    },
                },
            },
        });

        const completedAmount = completedAmountAgg._sum.amount ?? 0;

        return {
            total,
            paid,
            approved,
            active,
            completedAmount,
            claimsByDay: claimsByDay.map(({ date, count }) => ({
                date,
                count: Number(count), // <- BIGINT FIX
            })),
            successByMonth: successByMonth.map(({ month, success }) => ({
                month,
                success: success.toString(), // <- BIGINT FIX
            })),
            airlines: airlines.map((s) => ({
                name: s.name,
                icao: s.icao,
                count: Number(s._count._all), // <- BIGINT FIX
            })),
        };
    }
}
