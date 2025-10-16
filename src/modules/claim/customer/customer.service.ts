import { Injectable } from '@nestjs/common';
import { CustomerDto } from './dto/customer.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ClaimCustomer } from '@prisma/client';
import { normalizePhone } from '../../../utils/normalizePhone';

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
            },
        });
    }

    async getCustomer(customerId: string): Promise<ClaimCustomer | null> {
        return this.prisma.claimCustomer.findFirst({
            where: {
                id: customerId,
            },
        });
    }

    async setIsSignedCustomer(customerId: string, isSigned: boolean) {
        return this.prisma.claimCustomer.update({
            data: {
                isSigned,
            },
            where: {
                id: customerId,
            },
        });
    }
}
