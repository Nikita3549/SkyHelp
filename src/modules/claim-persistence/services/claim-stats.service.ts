import { Injectable } from '@nestjs/common';
import { ClaimStatus, PassengerPaymentStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { IAdminClaimsStatsResponse } from '../../claim/admin/interfaces/responses/admin-claims-stats-response.interface';

@Injectable()
export class ClaimStatsService {
    constructor(private readonly prisma: PrismaService) {}

    async getClaimsStats(
        userId?: string,
        agentId?: string,
        dateFilter?: { dateFrom: Date; dateTo: Date },
    ): Promise<IAdminClaimsStatsResponse> {
        const dateWhere = dateFilter
            ? { gte: dateFilter.dateFrom, lte: dateFilter.dateTo }
            : undefined;

        const [
            total,
            paid,
            approved,
            active,
            paidCustomersAmount,
            paidOtherPassengersAmount,
            claimsByDay,
            successByMonth,
            claimsViaBoardingPass,
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

            // sum of claim.customer.compensation where state.status = PAID
            this.prisma.claimCustomer.aggregate({
                where: {
                    paymentStatus: PassengerPaymentStatus.PAID,
                    Claim: {
                        some: {
                            userId,
                            agentId,
                            archived: false,
                            ...(dateWhere ? { createdAt: dateWhere } : {}),
                        },
                    },
                },
                _sum: { compensation: true },
            }),

            // sum of claim.passengers.compensation where state.status = PAID
            this.prisma.otherPassenger.aggregate({
                where: {
                    paymentStatus: PassengerPaymentStatus.PAID,
                    claim: {
                        userId,
                        agentId,
                        archived: false,
                        ...(dateWhere ? { createdAt: dateWhere } : {}),
                    },
                },
                _sum: { compensation: true },
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

            // claims via boarding pass
            this.prisma.claim.count({
                where: {
                    userId,
                    agentId,
                    archived: false,
                    state: {
                        scannedBoardingPass: true,
                    },
                },
            }),
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

        const completedAmount =
            (paidCustomersAmount._sum.compensation ?? 0) +
            (paidOtherPassengersAmount._sum.compensation ?? 0);

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
            claimsViaBoardingPass,
        };
    }
}
