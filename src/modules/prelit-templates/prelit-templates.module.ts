import { Module } from '@nestjs/common';
import { PrelitTemplatesService } from './prelit-templates.service';
import { PrelitTemplatesController } from './prelit-templates.controller';
import { ClaimModule } from '../claim/claim.module';

@Module({
    imports: [ClaimModule],
    providers: [PrelitTemplatesService],
    controllers: [PrelitTemplatesController],
})
export class PrelitTemplatesModule {}
