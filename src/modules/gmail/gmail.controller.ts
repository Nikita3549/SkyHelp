import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { IsModeratorGuard } from '../../guards/isModerator.guard';
import { GmailService } from './gmail.service';

@Controller('gmail')
@UseGuards(JwtAuthGuard, IsModeratorGuard)
export class GmailController {
    constructor(private readonly gmailService: GmailService) {}

    @Get()
    async getGmailMessages(@Query('page') page?: number) {
        // return this.gmailService.getGmailPage(page);
    }
}
