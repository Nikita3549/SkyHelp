import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Chat, Message, MessageStatus } from '@prisma/client';
import { IUserChatsWithMessages } from './interfaces/IUserChatsWithMessages';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class ChatService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly redis: RedisService,
    ) {}
    async createChat(firstUserId: string, secondUserId: string): Promise<Chat> {
        return this.prisma.chat.create({
            data: {
                members: {
                    createMany: {
                        data: [
                            { userId: firstUserId },
                            { userId: secondUserId },
                        ],
                    },
                },
            },
        });
    }

    async getUserChats(userId: string): Promise<Chat[]> {
        return this.prisma.chat.findMany({
            where: {
                members: {
                    some: {
                        userId,
                    },
                },
            },
        });
    }

    async createMessage(
        chatId: string,
        senderId: string,
        content: string,
    ): Promise<Message> {
        return this.prisma.message.create({
            data: {
                chatId,
                senderId,
                content,
            },
        });
    }
    async readMessage(messageId: string): Promise<Message> {
        return this.prisma.message.update({
            data: {
                status: MessageStatus.READ,
            },
            where: {
                id: messageId,
            },
        });
    }
    async getAllChatsWithMessages(
        userId: string,
    ): Promise<IUserChatsWithMessages[]> {
        return this.prisma.chat.findMany({
            where: {
                members: {
                    some: {
                        userId: userId,
                    },
                },
            },
            select: {
                id: true,
                messages: {
                    select: {
                        id: true,
                        senderId: true,
                        chatId: true,
                        content: true,
                        createdAt: true,
                        status: true,
                    },
                    orderBy: {
                        createdAt: 'asc',
                    },
                },
            },
        });
    }

    async saveOnlineStatus(userId: string) {
        await this.redis.set(`online_${userId}`, 'online');
    }
    async deleteOnlineStatus(userId: string) {
        await this.redis.del(`online_${userId}`);
    }
    async isOnline(userId: string): Promise<boolean> {
        return !!(await this.redis.get(`online_${userId}`));
    }
}
