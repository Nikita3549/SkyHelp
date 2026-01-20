import { Module } from '@nestjs/common';
import { StaffMessageService } from './staff-message.service';
import { StaffMessageController } from './staff-message.controller';
import { UserModule } from '../../user/user.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [ClaimPersistenceModule],
    providers: [StaffMessageService],
    controllers: [StaffMessageController],
})
export class StaffMessageModule {}
