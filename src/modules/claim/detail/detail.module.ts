import { Module } from '@nestjs/common';
import { DetailController } from './detail.controller';
import { DetailService } from './detail.service';
import { DocumentModule } from '../document/document.module';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [DocumentModule, ClaimPersistenceModule],
    controllers: [DetailController],
    providers: [DetailService],
    exports: [DetailService],
})
export class DetailModule {}
