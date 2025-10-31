import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IssueDto } from './dto/issue.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { IssueService } from './issue.service';
import { ClaimService } from '../claim.service';
import { IsAgentGuard } from '../../../guards/isAgent.guard';

@Controller('claims/issue')
@UseGuards(JwtAuthGuard)
export class IssueController {
    constructor(
        private readonly issueService: IssueService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsAgentGuard)
    @Put('admin')
    async updateIssue(@Body() dto: IssueDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        await this.claimService.changeUpdatedAt(claimId);

        return await this.issueService.updateIssue(dto, claimId);
    }
}
