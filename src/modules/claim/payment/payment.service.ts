import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateAdminPaymentDto } from './dto/update-admin-payment.dto';
import { InjectQueue } from '@nestjs/bullmq';
import {
    REQUEST_PAYMENT_DETAILS_QUEUE_KEY,
    SIX_DAYS,
    THREE_DAYS,
} from '../constants';
import { Queue } from 'bullmq';
import { IPaymentDetailsRequestJobData } from '../interfaces/job-data/payment-details-request-job-data.interface';
import { getNextWorkTime } from '../../../common/utils/getNextWorkTime';
import { UpdatePaymentDto } from './dto/update-payment.dto';

@Injectable()
export class PaymentService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(REQUEST_PAYMENT_DETAILS_QUEUE_KEY)
        private readonly requestPaymentDetailsQueue: Queue,
    ) {}

    async schedulePaymentDetailsRequests(
        jobData: IPaymentDetailsRequestJobData,
    ) {
        const delays = [0, THREE_DAYS, SIX_DAYS];

        delays.forEach((delay) => {
            this.requestPaymentDetailsQueue.add(
                'paymentDetailsRequest',
                jobData,
                {
                    delay: getNextWorkTime(delay),
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                },
            );
        });
    }

    async updatePayment(dto: UpdatePaymentDto, claimId: string) {
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
                idnp: dto.idnp,
                bic: dto.bic,
                region: dto.region,
            },
        });
    }
}
