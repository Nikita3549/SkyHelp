import { IsString } from 'class-validator';

export class SendToCeoDto {
    @IsString()
    subject: string;

    @IsString()
    body: string;
}
