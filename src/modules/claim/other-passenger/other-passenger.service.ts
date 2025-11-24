import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OtherPassenger } from '@prisma/client';
import { OtherPassengerDto } from './dto/create-other-passengers.dto';

@Injectable()
export class OtherPassengerService {
    constructor(private readonly prisma: PrismaService) {}

    async setIsSignedPassenger(passengerId: string, isSigned: boolean) {
        return this.prisma.otherPassenger.update({
            data: {
                isSigned,
            },
            where: {
                id: passengerId,
            },
        });
    }

    async createOtherPassengers(
        passengers: OtherPassengerDto[],
        claimId: string,
        compensation: number,
    ) {
        return Promise.all(
            passengers.map((p) =>
                this.prisma.otherPassenger.create({
                    data: {
                        ...p,
                        claimId,
                        compensation,
                    },
                }),
            ),
        );
    }

    async updatePassenger(
        passenger: Partial<OtherPassenger>,
        passengerId: string,
    ) {
        return this.prisma.otherPassenger.update({
            data: {
                ...passenger,
            },
            where: {
                id: passengerId,
            },
        });
    }

    async getOtherPassenger(
        passengerId: string,
    ): Promise<OtherPassenger | null> {
        return this.prisma.otherPassenger.findFirst({
            where: {
                id: passengerId,
            },
        });
    }

    async setOtherPassengerAsMinor(passengerId: string) {
        return this.prisma.otherPassenger.update({
            data: {
                isMinor: true,
            },
            where: {
                id: passengerId,
            },
        });
    }
}
