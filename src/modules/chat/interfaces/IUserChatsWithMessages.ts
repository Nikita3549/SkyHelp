import { Message } from '@prisma/client';

export interface IUserChatsWithMessages {
    id: string;
    messages: Message[];
}
