import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { IStaffChat } from './interfaces/staff-chat.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffMessage } from '@prisma/client';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';
import { CLAIM_NOT_FOUND } from '../constants';

@Injectable()
export class StaffMessageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    async findMessages(claimId: string): Promise<StaffMessage[]> {
        return this.prisma.staffMessage.findMany({
            where: {
                claimId,
            },
            orderBy: {
                sentAt: 'asc',
            },
        });
    }

    async createMessage(data: {
        fromId: string;
        body: string;
        claimId: string;
    }): Promise<StaffMessage> {
        const claim = await this.claimPersistenceService.findOneById(
            data.claimId,
        );

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        return this.prisma.staffMessage.create({
            data: {
                claimId: data.claimId,
                fromId: data.fromId,
                body: data.body,
            },
        });
    }
}
