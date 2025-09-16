import {
    OnGatewayConnection,
    OnGatewayDisconnect,
    SubscribeMessage,
    WebSocketGateway,
    WebSocketServer,
    WsException,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UseFilters, UsePipes, ValidationPipe } from '@nestjs/common';
import { AuthSocket } from '../auth/interfaces/authSocket.interface';
import { TokenService } from '../token/token.service';
import { ChatService } from './chat.service';
import { SendMessageDto } from './dto/send-message.dto';
import {
    INVALID_CHAT_ID,
    INVALID_MESSAGE_ID,
    INVALID_TOKEN,
    INVALID_USER_ID,
    MESSAGE_ACK_SUCCESSFUL,
} from './constants';
import { MessageReadDto } from './dto/message-read.dto';
import { CreateChatDto } from './dto/create-chat.dto';
import { ValidationFilter } from '../../filters/validation.filter';
import { FollowStatusDto } from './dto/follow-status.dto';
import { IJwtPayload } from '../token/interfaces/jwtPayload';

@WebSocketGateway({
    namespace: '/ws/chat',
    cors: {
        origin: '*',
    },
})
@UseFilters(new ValidationFilter())
@UsePipes(new ValidationPipe({ transform: true }))
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    constructor(
        private readonly tokenService: TokenService,
        private readonly chatService: ChatService,
    ) {}

    @WebSocketServer() server: Server;

    async handleConnection(client: Socket) {
        try {
            const token: string | undefined =
                client.handshake.auth?.token ||
                client.handshake.headers.authorization?.split(' ')[1];

            if (!token) {
                throw new Error();
            }

            const payload =
                await this.tokenService.verifyJWT<IJwtPayload>(token);

            client.data = payload;

            await this.chatService.saveOnlineStatus(payload.id);
            this.server
                .in(`status_${payload.id}`)
                .emit('status_online', payload.id);
        } catch (_e: unknown) {
            client.emit('exception', INVALID_TOKEN);
            client.disconnect();
        }

        const clientChats = await this.chatService.getUserChats(
            client.data.userId,
        );

        for (let i = 0; i < clientChats.length; i++) {
            client.join(`chat_${clientChats[i].id}`);
        }

        // constants unreadMessages = await this.chatService.getUnreadMessages(
        // 	client.data.userUuid,
        // );
        //
        // for (let i = 0; i < unreadMessages.length; i++) {
        // 	client.emit('message_receive', unreadMessages[i]);
        // }
    }

    async handleDisconnect(client: AuthSocket) {
        const { id: userId } = client.data;

        await this.chatService.deleteOnlineStatus(userId);

        this.server.in(`status_${userId}`).emit('status_offline', userId);
    }

    @SubscribeMessage('new_chat')
    async handleNewChat(client: AuthSocket, dto: CreateChatDto) {
        const { secondChatUser } = dto;

        if (client.data.id == secondChatUser) {
            throw new WsException(INVALID_CHAT_ID);
        }

        await this.chatService
            .createChat(client.data.id, secondChatUser)
            .catch((_e: unknown) => {
                throw new WsException(INVALID_USER_ID);
            });

        client.emit('new_chat', 'Successful created');
    }

    @SubscribeMessage('message_send')
    async handleSendMessage(client: AuthSocket, dto: SendMessageDto) {
        const { chatId, content } = dto;

        const message = await this.chatService
            .createMessage(chatId, client.data.id, content)
            .catch((_e: unknown) => {
                throw new WsException(INVALID_CHAT_ID);
            });

        client.emit('message_ack', MESSAGE_ACK_SUCCESSFUL(message.id));

        client.broadcast.to(`chat_${chatId}`).emit('message_receive', message);
    }

    @SubscribeMessage('message_read')
    async handleMessageRead(client: AuthSocket, dto: MessageReadDto) {
        const { messageId } = dto;

        await this.chatService.readMessage(messageId).catch((_e: unknown) => {
            throw new WsException(INVALID_MESSAGE_ID);
        });

        client.broadcast
            .to(`chat_${dto.chatId}`)
            .emit('message_read', messageId);
    }

    @SubscribeMessage('status_follow')
    async handleStatusFollow(client: AuthSocket, dto: FollowStatusDto) {
        const { userId } = dto;

        if (userId == client.data.id) {
            throw new WsException('Bad Request');
        }

        client.join(`status_${userId}`);

        const isOnline = await this.chatService.isOnline(userId);

        if (isOnline) {
            client.emit('status_online', userId);
        } else {
            client.emit('status_offline', userId);
        }
    }
}
