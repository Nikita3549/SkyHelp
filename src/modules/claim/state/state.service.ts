import { Injectable } from '@nestjs/common';
import { StateDto } from './dto/state.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaimStatus } from '@prisma/client';

@Injectable()
export class StateService {
    constructor(private readonly prisma: PrismaService) {}

    async updateState(dto: StateDto, claimId: string) {
        return this.prisma.claimState.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { stateId: true },
                    })
                ).stateId,
            },
            data: {
                amount: dto.amount,
                status: dto.status,
                comments: dto.comments,
            },
        });
    }

    async updateStatus(newStatus: ClaimStatus, claimStateId: string) {
        return this.prisma.claimState.update({
            data: {
                status: newStatus,
            },
            where: {
                id: claimStateId,
            },
        });
    }
}
