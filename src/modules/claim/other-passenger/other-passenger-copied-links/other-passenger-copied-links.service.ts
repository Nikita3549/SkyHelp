import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class OtherPassengerCopiedLinksService {
    constructor(private readonly prisma: PrismaService) {}

    async create(otherPassengerId: string, isSent: boolean) {
        return this.prisma.otherPassengerCopiedLink.create({
            data: {
                otherPassengerId,
                isSent,
            },
        });
    }

    async markAsOpened(otherPassengerId: string) {
        return this.prisma.otherPassengerCopiedLink.updateMany({
            where: {
                otherPassengerId,
            },
            data: {
                openedAt: new Date(),
            },
        });
    }
}
