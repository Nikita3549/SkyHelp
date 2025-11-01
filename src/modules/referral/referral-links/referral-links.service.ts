import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReferralLinksService {
    constructor(private readonly prisma: PrismaService) {}

    async createReferralLinks(data: {
        referralCode: string;
        source: string;
        path: string;
        partnerId: string;
    }) {
        return this.prisma.referralLink.create({
            data: {
                referralCode: data.referralCode,
                source: data.source,
                partnerId: data.partnerId,
                path: data.path,
            },
        });
    }

    async getReferralLinks(userId?: string) {
        return this.prisma.referralLink.findMany({
            where: {
                partner: {
                    userId,
                },
            },
        });
    }

    async saveReferralClick(referralCode: string, source: string) {
        try {
            const referralLink = await this.prisma.referralLink.findFirst({
                where: {
                    referralCode,
                    source,
                },
            });

            if (!referralLink) {
                return;
            }

            this.prisma.referralLinkClick.upsert({
                where: {
                    date_linkId: {
                        linkId: referralLink.id,
                        date: new Date(),
                    },
                },
                update: {
                    clicks: {
                        increment: 1,
                    },
                },
                create: {
                    linkId: referralLink.id,
                },
            });
        } catch (e) {
            console.error(e);
        }
    }
}
