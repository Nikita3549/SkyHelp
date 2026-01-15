import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaimIncludeProvider } from '../providers/claim-include.provider';
import { ClaimStatus, Prisma, UserRole } from '@prisma/client';
import { ViewClaimType } from '../enums/view-claim-type.enum';
import {
    IAccountantClaim,
    IAffiliateClaim,
    IFullClaim,
} from '../types/claim-persistence.types';

@Injectable()
export class ClaimSearchService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimIncludeProvider: ClaimIncludeProvider,
    ) {}

    async getUserClaims(
        userId?: string,
        page: number = 1,
        searchParams?: {
            archived?: boolean;
            date?: { start: Date; end: Date };
            status?: ClaimStatus;
            airlineIcaos?: string[];
            flightNumber?: string;
            role?: UserRole;
            agentId?: string;
            duplicated?: boolean;
            isOrderByAssignedAt?: boolean;
            onlyRecentlyUpdates?: boolean;
            phone?: string;
            email?: string;
            referralCode?: string;
            viewType?: ViewClaimType;
            withPartner?: boolean;
        },
        pageSize: number = 20,
    ): Promise<{
        claims: IFullClaim[] | IAffiliateClaim[] | IAccountantClaim[];
        total: number;
    }> {
        const skip = (page - 1) * pageSize;

        const where: Prisma.ClaimWhereInput = {
            userId,
            archived: searchParams?.archived,
            state: {},
            details: { airlines: {} },
            customer: {},
        };

        let orderBy: Prisma.ClaimOrderByWithRelationInput = {
            createdAt: 'desc',
        };

        if (searchParams?.duplicated) where.duplicates = { some: {} };
        if (searchParams?.referralCode)
            where.referrer = searchParams.referralCode;
        if (searchParams?.phone) where.customer!.phone = searchParams.phone;
        if (searchParams?.email) where.customer!.email = searchParams.email;
        if (searchParams?.onlyRecentlyUpdates)
            where.state!.hasRecentUpdate = searchParams.onlyRecentlyUpdates;
        if (searchParams?.status) where.state!.status = searchParams.status;
        if (searchParams?.agentId) where.agentId = searchParams.agentId;
        if (searchParams?.flightNumber)
            where.details!.flightNumber = searchParams.flightNumber;
        if (searchParams?.airlineIcaos && searchParams.airlineIcaos.length > 0)
            where.details!.airlines!.icao = {
                in: searchParams.airlineIcaos,
            };
        if (searchParams?.date)
            where.createdAt = {
                gte: searchParams.date.start,
                lt: searchParams.date.end,
            };
        if (searchParams?.role) where.agent = { role: searchParams.role };
        if (searchParams?.withPartner) where.referrer = { not: null };

        if (searchParams?.onlyRecentlyUpdates)
            orderBy = { recentUpdatedAt: 'desc' };
        if (searchParams?.isOrderByAssignedAt) orderBy = { assignedAt: 'desc' };

        const include = this.claimIncludeProvider.getInclude(
            searchParams?.viewType || ViewClaimType.FULL,
        );

        const [claims, total] = await this.prisma.$transaction([
            this.prisma.claim.findMany({
                where,
                orderBy,
                include,
                skip,
                take: pageSize,
            }),
            this.prisma.claim.count({ where }),
        ]);

        return {
            claims: claims as
                | IFullClaim[]
                | IAffiliateClaim[]
                | IAccountantClaim[],
            total,
        };
    }

    async searchClaims(search: string, agentId?: string, page: number = 20) {
        const normalized = search.replace(/\s+/g, '');

        const ids = await this.prisma.$queryRaw<Array<{ id: string }>>`
          SELECT "claims"."id"
          FROM "claims"
               LEFT JOIN "claim_customers" ON "claims"."customer_id" = "claim_customers"."id"
               LEFT JOIN "claim_details" ON "claim_details"."id" = "claims"."details_id"
               LEFT JOIN "claim_states" ON "claim_states"."id" = "claims"."state_id"
          WHERE (
              REPLACE("claim_details"."booking_ref", ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE("claim_details"."flight_number", ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE("claim_states"."comments", ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE("claim_customers"."phone", ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE("claim_customers"."email", ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE("claim_customers"."first_name", ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE("claim_customers"."last_name", ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE("claims"."id"::text, ' ', '') ILIKE ${`%${normalized}%`}
              OR REPLACE(CONCAT("claim_customers"."first_name", "claim_customers"."last_name"), ' ', '') ILIKE ${`%${normalized}%`}
          )
          AND (${agentId ?? null}::text IS NULL OR "claims"."agent_id" = ${agentId ?? null}::text)
          ORDER BY "claims"."created_at" DESC
          LIMIT ${page}
        `;

        return this.prisma.claim.findMany({
            where: { id: { in: ids.map((i) => i.id) } },
            include: this.claimIncludeProvider.getInclude(),
            orderBy: {
                createdAt: 'desc',
            },
            take: page,
        });
    }
}
