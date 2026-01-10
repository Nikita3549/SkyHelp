import { Module } from '@nestjs/common';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { ClaimPersistenceModule } from '../../claim-persistence/claim-persistence.module';

@Module({
    imports: [ClaimPersistenceModule],
    controllers: [IssueController],
    providers: [IssueService],
})
export class IssueModule {}
