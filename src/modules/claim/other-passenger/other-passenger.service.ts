import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
    ClaimStatus,
    OtherPassenger,
    PassengerPaymentStatus,
} from '@prisma/client';
import { OtherPassengerDto } from './dto/create-other-passengers.dto';

@Injectable()
export class OtherPassengerService {
    constructor(private readonly prisma: PrismaService) {}

    async setIsSignedPassenger(passengerId: string, isSigned: boolean) {
        return this.prisma.otherPassenger.update({
            data: {
                isSigned,
                signedAt: new Date(),
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
                        claimStatus: ClaimStatus.CLAIM_RECEIVED,
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
                firstName: passenger.firstName,
                lastName: passenger.lastName,
                address: passenger.address,
                city: passenger.city,
                country: passenger.country,
                birthday: passenger.birthday,
                email: passenger.email,
                parentLastName: passenger.parentLastName,
                parentFirstName: passenger.parentFirstName,
                compensation: passenger.compensation,
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

    async updatePaymentStatus(
        paymentStatus: PassengerPaymentStatus,
        passengerId: string,
    ) {
        return this.prisma.otherPassenger.update({
            data: {
                paymentStatus,
            },
            where: {
                id: passengerId,
            },
        });
    }
}
