import { Injectable } from '@nestjs/common';
import { ClaimFlightStatusSource } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { DetailService } from '../detail/detail.service';

@Injectable()
export class FlightStatusService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly detailsService: DetailService,
    ) {}

    async saveRequestStats(source: ClaimFlightStatusSource) {
        await this.prisma.flightStatusRequest.create({
            data: {
                flightStatusSource: source,
            },
        });
    }

    async createFlightStatus(
        flightStatusData: {
            isCancelled: boolean;
            delayMinutes: number;
            source: ClaimFlightStatusSource;
            exactTime?: Date;
        },
        claimId: string,
    ) {
        if (flightStatusData?.exactTime) {
            await this.detailsService.updateDetails(
                {
                    date: flightStatusData.exactTime,
                    hasTime: !!flightStatusData.exactTime,
                },
                claimId,
            );
        }

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
