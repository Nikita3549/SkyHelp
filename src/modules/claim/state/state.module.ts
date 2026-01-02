import { forwardRef, Module } from '@nestjs/common';
import { StateController } from './state.controller';
import { StateService } from './state.service';
import { ClaimModule } from '../claim.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [ClaimPersistenceModule],
    controllers: [StateController],
    providers: [StateService],
    exports: [StateService],
})
export class StateModule {}
