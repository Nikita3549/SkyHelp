import {
    Body,
    Controller,
    Get,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { IStaffChat } from './interfaces/staff-chat.interface';
import { StaffMessageService } from './staff-message.service';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { RoleGuard } from '../../../common/guards/role.guard';
import { StaffRoles } from './constants/staff-roles.enum';
import { StaffMessage } from '@prisma/client';
import { AuthRequest } from '../../../common/interfaces/AuthRequest.interface';
import { GetMessagesDto } from './dto/get-messages.dto';
import { SendMessageDto } from './dto/send-message.dto';
import { IStaffMessageWithUser } from './interfaces/staff-message-with-user.interface';

@Controller('claims/staff-chat/messages')
@UseGuards(JwtAuthGuard, new RoleGuard(StaffRoles))
export class StaffMessageController {
    constructor(private readonly staffChatService: StaffMessageService) {}

    @Get()
    async getMessages(
        @Query() dto: GetMessagesDto,
    ): Promise<IStaffMessageWithUser[]> {
        return this.staffChatService.findMessages(dto.claimId);
    }

    @Post()
    async sendMessages(
        @Req() req: AuthRequest,
        @Body() dto: SendMessageDto,
    ): Promise<IStaffMessageWithUser> {
        return this.staffChatService.createMessage({
            fromId: req.user.id,
            claimId: dto.claimId,
            body: dto.body,
        });
    }
}
