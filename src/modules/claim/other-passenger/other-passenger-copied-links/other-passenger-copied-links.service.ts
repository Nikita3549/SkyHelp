import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OtherPassengerCopiedLinkType } from '@prisma/client';

@Injectable()
export class OtherPassengerCopiedLinksService {
    constructor(private readonly prisma: PrismaService) {}

    async createIfNotExist(
        otherPassengerId: string,
        isSent: boolean,
        type: OtherPassengerCopiedLinkType,
    ) {
        return this.prisma.otherPassengerCopiedLink.upsert({
            create: {
                otherPassengerId,
                isSent,
                type,
            },
            update: {},
            where: {
                otherPassengerId_type: {
                    otherPassengerId,
                    type,
                },
            },
        });
    }

    async markAsOpened(
        otherPassengerId: string,
        type: OtherPassengerCopiedLinkType,
    ) {
        return this.prisma.otherPassengerCopiedLink.updateMany({
            where: {
                otherPassengerId,
                type,
            },
            data: {
                openedAt: new Date(),
            },
        });
    }
}
