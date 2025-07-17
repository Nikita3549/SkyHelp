import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentDto } from './dto/payment.dto';

@Injectable()
export class PaymentService {
    constructor(private readonly prisma: PrismaService) {}

    async updatePayment(dto: PaymentDto, claimId: string) {
        return this.prisma.claimPayment.update({
            where: {
                id: (
                    await this.prisma.claim.findUniqueOrThrow({
                        where: { id: claimId },
                        select: { paymentId: true },
                    })
                ).paymentId as string,
            },
            data: {
                paymentMethod: dto.paymentMethod,
                accountName: dto.accountName,
                accountNumber: dto.accountNumber,
                email: dto.email,
                iban: dto.iban,
                paypalEmail: dto.paypalEmail,
                bankName: dto.bankName,
            },
        });
    }
}
