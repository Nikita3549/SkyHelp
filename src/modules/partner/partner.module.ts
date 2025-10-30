import { forwardRef, Module } from '@nestjs/common';
import { PartnerController } from './partner.controller';
import { PartnerService } from './partner.service';
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    controllers: [PartnerController],
    providers: [PartnerService],
    exports: [PartnerService],
})
export class PartnerModule {}
