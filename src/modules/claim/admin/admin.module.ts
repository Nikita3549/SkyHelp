import { forwardRef, Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { ClaimModule } from '../claim.module';
import { UserModule } from '../../user/user.module';

@Module({
    imports: [forwardRef(() => ClaimModule), UserModule],
    controllers: [AdminController],
})
export class AdminModule {}
