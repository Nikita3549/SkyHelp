import { IsEnum } from 'class-validator';
import { PassengerPaymentStatus } from '@prisma/client';

export class UpdatePaymentStatusDto {
    @IsEnum(PassengerPaymentStatus)
    paymentStatus: PassengerPaymentStatus;
}
