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
        name: string;
    }) {
        return this.prisma.referralLink.create({
            data: {
                referralCode: data.referralCode,
                source: data.source,
                partnerId: data.partnerId,
                path: data.path,
                name: data.name,
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

    async getReferralLink(source: string, referralCode: string) {
        return this.prisma.referralLink.findFirst({
            where: {
                source,
                referralCode,
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

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            await this.prisma.referralLinkClick.upsert({
                where: {
                    date_linkId: {
                        linkId: referralLink.id,
                        date: today,
                    },
                },
                update: {
                    clicks: {
                        increment: 1,
                    },
                },
                create: {
                    date: today,
                    linkId: referralLink.id,
                },
            });
        } catch (e) {
            console.error(e);
        }
    }
}
