import { IsOptional, IsString } from 'class-validator';

export class MessageReadDto {
    @IsString()
    messageId: string;

    @IsOptional()
    @IsString()
    chatId: string;
}
