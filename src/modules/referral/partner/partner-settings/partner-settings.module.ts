import { forwardRef, Module } from '@nestjs/common';
import { PartnerSettingsController } from './partner-settings.controller';
import { PartnerSettingsService } from './partner-settings.service';
import { PartnerService } from '../partner.service';
import { PartnerModule } from '../partner.module';

@Module({
    imports: [forwardRef(() => PartnerModule)],
    controllers: [PartnerSettingsController],
    providers: [PartnerSettingsService],
    exports: [PartnerSettingsService],
})
export class PartnerSettingsModule {}
