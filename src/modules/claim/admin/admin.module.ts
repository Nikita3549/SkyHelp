import { forwardRef, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    controllers: [AdminController],
})
export class AdminModule {}
