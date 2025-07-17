import { forwardRef, Module } from '@nestjs/common';
import { DetailController } from './detail.controller';
import { DetailService } from './detail.service';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    controllers: [DetailController],
    providers: [DetailService],
})
export class DetailModule {}
