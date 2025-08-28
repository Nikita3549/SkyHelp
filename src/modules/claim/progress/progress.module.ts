import { forwardRef, Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { StateModule } from '../state/state.module';
import { NotificationModule } from '../../notification/notification.module';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [
        StateModule,
        forwardRef(() => NotificationModule),
        forwardRef(() => ClaimModule),
    ],
    controllers: [ProgressController],
    providers: [ProgressService],
})
export class ProgressModule {}
