import { IsOptional, IsString } from 'class-validator';

export class SendLetterDto {
    @IsString()
    to: string;

    @IsString()
    subject: string;

    @IsString()
    content: string;

    @IsOptional()
    @IsString()
    claimId?: string;
}
