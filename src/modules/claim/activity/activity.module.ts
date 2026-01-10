import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [ClaimPersistenceModule],
    providers: [ActivityService],
    controllers: [ActivityController],
    exports: [ActivityService],
})
export class ActivityModule {}
