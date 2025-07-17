import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OtherPassenger } from '@prisma/client';
import { UpdatePassengerDto } from './dto/update-passenger.dto';

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
        passengers: Omit<
            Omit<Omit<OtherPassenger, 'id'>, 'claimId'>,
            'isSigned'
        >[],
        claimId: string,
    ) {
        return Promise.all(
            passengers.map((p) =>
                this.prisma.otherPassenger.create({
                    data: {
                        ...p,
                        claimId,
                    },
                }),
            ),
        );
    }

    async updatePassenger(passenger: UpdatePassengerDto, passengerId: string) {
        return this.prisma.otherPassenger.update({
            data: passenger,
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
}
