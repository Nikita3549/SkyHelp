import { forwardRef, Module } from '@nestjs/common';
import { PartnerService } from './partner.service';
import { ClaimModule } from '../../claim/claim.module';
import { PartnerController } from './partner.controller';
import { PartnerSettingsModule } from './partner-settings/partner-settings.module';

@Module({
    imports: [PartnerSettingsModule],
    providers: [PartnerService],
    exports: [PartnerService],
    controllers: [PartnerController],
})
export class PartnerModule {}
