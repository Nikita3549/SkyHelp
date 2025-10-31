import { forwardRef, Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    providers: [PartnerService],
    exports: [PartnerService],
})
export class PartnerModule {}
