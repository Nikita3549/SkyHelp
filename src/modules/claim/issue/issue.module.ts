import { forwardRef, Module } from '@nestjs/common';
import { IssueController } from './issue.controller';
import { IssueService } from './issue.service';
import { ClaimModule } from '../claim.module';

@Module({
    imports: [forwardRef(() => ClaimModule)],
    controllers: [IssueController],
    providers: [IssueService],
})
export class IssueModule {}
