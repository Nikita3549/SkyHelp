import { Module } from '@nestjs/common';
import { ProgressController } from './progress.controller';
import { ProgressService } from './progress.service';
import { StateModule } from '../state/state.module';

@Module({
    imports: [StateModule],
    controllers: [ProgressController],
    providers: [ProgressService],
})
export class ProgressModule {}
