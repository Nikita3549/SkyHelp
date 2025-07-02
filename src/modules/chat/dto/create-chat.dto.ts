import { IsString } from 'class-validator';

export class CreateChatDto {
    @IsString()
    secondChatUser: string;
}
