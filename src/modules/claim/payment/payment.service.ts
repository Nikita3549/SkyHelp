import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InjectQueue } from '@nestjs/bullmq';
import {
    REQUEST_PAYMENT_DETAILS_QUEUE_KEY,
    SIX_DAYS,
    THREE_DAYS,
} from '../constants';
import { Queue } from 'bullmq';
import { IPaymentDetailsRequestJobData } from '../interfaces/job-data/payment-details-request-job-data.interface';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { RedisService } from '../../redis/redis.service';
import { DAY, DAY_IN_SECONDS } from '../../../common/constants/time.constants';

@Injectable()
export class PaymentService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(REQUEST_PAYMENT_DETAILS_QUEUE_KEY)
        private readonly requestPaymentDetailsQueue: Queue,
        private readonly redisService: RedisService,
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
                    delay,
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
                bankAddress: dto.bankAddress,
            },
        });
    }

    async setBlockPaymentRequests(claimId: string, block: boolean) {
        await this.redisService.setex(
            this.generateBlockPaymentRequestsKey(claimId),
            DAY_IN_SECONDS * 7,
            `${block}`,
        );
    }

    async getBlockPaymentRequests(claimId: string): Promise<boolean> {
        const value = await this.redisService.get(
            this.generateBlockPaymentRequestsKey(claimId),
        );

        return value == 'true';
    }

    private generateBlockPaymentRequestsKey(claimId: string): string {
        return `${claimId}:block-payment-requests`;
    }
}
