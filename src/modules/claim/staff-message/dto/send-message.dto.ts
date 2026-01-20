import { IsString } from 'class-validator';

export class SendMessageDto {
    @IsString()
    body: string;

    @IsString()
    claimId: string;
}
