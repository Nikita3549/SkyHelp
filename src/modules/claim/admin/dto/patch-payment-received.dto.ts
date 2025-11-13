import { IsBoolean } from 'class-validator';

export class PatchPaymentReceivedDto {
    @IsBoolean()
    paymentReceived: boolean;
}
