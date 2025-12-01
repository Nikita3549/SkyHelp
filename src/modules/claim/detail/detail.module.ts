import { forwardRef, Module } from '@nestjs/common';
import { DetailController } from './detail.controller';
import { DetailService } from './detail.service';
import { ClaimModule } from '../claim.module';
import { DocumentModule } from '../document/document.module';

@Module({
    imports: [forwardRef(() => ClaimModule), DocumentModule],
    controllers: [DetailController],
    providers: [DetailService],
})
export class DetailModule {}
