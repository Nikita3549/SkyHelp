import { Injectable } from '@nestjs/common';
import { ClaimFlightStatusSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class FlightStatusService {
    constructor(private readonly prisma: PrismaService) {}

    async createFlightStatus(
        flightStatusData: {
            isCancelled: boolean;
            delayMinutes: number;
            source: ClaimFlightStatusSource;
        },
        claimId: string,
    ) {
        return this.prisma.claimFlightStatus.create({
            data: {
                isCancelled: flightStatusData.isCancelled,
                delayMinutes: flightStatusData.delayMinutes,
                source: flightStatusData.source,
                claimId,
            },
        });
    }

    async deleteFlightStatus(flightStatusId: string) {
        return this.prisma.claimFlightStatus.delete({
            where: {
                id: flightStatusId,
            },
        });
    }

    async getFlightStatus(flightStatusId: string) {
        return this.prisma.claimFlightStatus.findFirst({
            where: {
                id: flightStatusId,
            },
        });
    }

    async getFlightStatusBySourceAndClaimId(
        source: ClaimFlightStatusSource,
        claimId: string,
    ) {
        return this.prisma.claimFlightStatus.findFirst({
            where: {
                source,
                claimId,
            },
        });
    }
}
