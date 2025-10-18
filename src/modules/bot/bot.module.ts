import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { NotificationModule } from '../notification/notification.module';
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [NotificationModule, ClaimModule],
    controllers: [BotController],
})
export class BotModule {}
