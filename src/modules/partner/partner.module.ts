import { forwardRef, Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { ClaimModule } from '../claim/claim.module';
import { PartnerController } from './partner.controller';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    providers: [PartnerService],
    exports: [PartnerService],
    controllers: [PartnerController],
})
export class PartnerModule {}
