import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UnsubscribeEmailService {
    constructor(private readonly prisma: PrismaService) {}

    async getUnsubscribeEmail(email: string) {
        return this.prisma.emailUnsubscribe.findFirst({
            where: {
                email,
            },
        });
    }

    async createUnsubscribeEmail(email: string) {
        return this.prisma.emailUnsubscribe.create({
            data: {
                email,
            },
        });
    }
}
