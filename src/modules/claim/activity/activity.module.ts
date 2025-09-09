import { Module } from '@nestjs/common';
import { ActivityService } from './activity.service';
import { ActivityController } from './activity.controller';
import { ClaimModule } from '../claim.module';
import { forwardRef } from '@nestjs/common/utils/forward-ref.util';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    providers: [ActivityService],
    controllers: [ActivityController],
    exports: [ActivityService],
})
export class ActivityModule {}
