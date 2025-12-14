import { Controller, Get, Req } from '@nestjs/common';
import { AuthRequest } from '../../common/interfaces/AuthRequest.interface';
import { ChatService } from './chat.service';
import { IUserChatsWithMessages } from './interfaces/IUserChatsWithMessages';

@Controller('chat')
export class ChatController {
    constructor(private readonly chatService: ChatService) {}

    @Get('/all')
    async getAllChats(
        @Req() req: AuthRequest,
    ): Promise<IUserChatsWithMessages[]> {
        const userUuid = req.user.id;

        return this.chatService.getAllChatsWithMessages(userUuid);
    }
}
