import { forwardRef, Module } from '@nestjs/common';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    controllers: [StateController],
    providers: [StateService],
    exports: [StateService],
})
export class StateModule {}
