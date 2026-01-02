import { Module } from '@nestjs/common';
import { BotController } from './bot.controller';
import { NotificationModule } from '../notification/notification.module';
import { ClaimModule } from '../claim/claim.module';
import { ClaimPersistenceModule } from '../claim-persistence/claim-persistence.module';

@Module({
    imports: [NotificationModule, ClaimPersistenceModule],
    controllers: [BotController],
})
export class BotModule {}
