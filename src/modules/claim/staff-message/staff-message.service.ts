import { Injectable, NotFoundException } from '@nestjs/common';
import { UserService } from '../../user/user.service';
import { IStaffChat } from './interfaces/staff-chat.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { StaffMessage } from '@prisma/client';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';
import { CLAIM_NOT_FOUND } from '../constants';
import { IStaffMessageWithUser } from './interfaces/staff-message-with-user.interface';

@Injectable()
export class StaffMessageService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    async findMessages(claimId: string): Promise<IStaffMessageWithUser[]> {
        return (
            await this.prisma.staffMessage.findMany({
                where: {
                    claimId,
                },
                ...this.getMessageWithUserInclude(),
                orderBy: {
                    sentAt: 'asc',
                },
            })
        ).map((s) => ({
            ...s,
            fromUser: {
                email: s.fromUser.email,
                firstName: s.fromUser.name,
                lastName: s.fromUser.secondName,
                role: s.fromUser.role,
            },
        }));
    }

    async createMessage(data: {
        fromId: string;
        body: string;
        claimId: string;
    }): Promise<IStaffMessageWithUser> {
        const claim = await this.claimPersistenceService.findOneById(
            data.claimId,
        );

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const staffMessage = await this.prisma.staffMessage.create({
            data: {
                claimId: data.claimId,
                fromId: data.fromId,
                body: data.body,
            },
            ...this.getMessageWithUserInclude(),
        });

        return {
            ...staffMessage,
            fromUser: {
                email: staffMessage.fromUser.email,
                firstName: staffMessage.fromUser.name,
                lastName: staffMessage.fromUser.secondName,
                role: staffMessage.fromUser.role,
            },
        };
    }

    private getMessageWithUserInclude() {
        return {
            include: {
                fromUser: {
                    select: {
                        email: true,
                        name: true,
                        secondName: true,
                        role: true,
                    },
                },
            },
        } as const;
    }
}
