import { Module } from '@nestjs/common';
import { ClaimPersistenceService } from './claim-persistence.service';

@Module({
    providers: [ClaimPersistenceService],
    exports: [ClaimPersistenceService],
})
export class ClaimPersistenceModule {}
