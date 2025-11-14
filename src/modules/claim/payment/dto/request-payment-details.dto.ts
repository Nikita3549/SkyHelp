import { IsString } from 'class-validator';

export class RequestPaymentDetailsDto {
    @IsString()
    claimId: string;
}
