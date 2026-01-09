import { Injectable } from '@nestjs/common';
import { CustomerDto } from './dto/customer.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { normalizePhone } from '../../../common/utils/normalizePhone';
import { PassengerPaymentStatus } from '@prisma/client';

@Injectable()
export class CustomerService {
    constructor(private readonly prisma: PrismaService) {}

    async updateCustomer(dto: CustomerDto, claimId: string) {
        return this.prisma.claimCustomer.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { customerId: true },
                    })
                ).customerId,
            },
            data: {
                firstName: dto.firstName,
                lastName: dto.lastName,
                email: dto.email,
                phone: normalizePhone(dto.phone),
                address: dto.address,
                country: dto.country,
                city: dto.city,
                compensation: dto.compensation,
            },
        });
    }

    async getCustomer(customerId: string) {
        return this.prisma.claimCustomer.findFirst({
            where: {
                id: customerId,
            },
            include: {
                Claim: true,
            },
        });
    }

    async setIsSignedCustomer(customerId: string, isSigned: boolean) {
        return this.prisma.claimCustomer.update({
            data: {
                isSigned,
                signedAt: new Date(),
            },
            where: {
                id: customerId,
            },
        });
    }

    async updatePaymentStatus(
        paymentStatus: PassengerPaymentStatus,
        customerId: string,
    ) {
        return this.prisma.claimCustomer.update({
            data: {
                paymentStatus,
            },
            where: {
                id: customerId,
            },
        });
    }
}
