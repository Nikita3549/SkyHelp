import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsAdminGuard } from '../../../guards/isAdminGuard';
import { IssueDto } from './dto/issue.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { IssueService } from './issue.service';
import { ClaimService } from '../claim.service';

@Controller('claims/issue')
@UseGuards(JwtAuthGuard)
export class IssueController {
    constructor(
        private readonly issueService: IssueService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsAdminGuard)
    @Put('admin')
    async updateIssue(@Body() dto: IssueDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimService.changeUpdatedAt(claimId);

        return await this.issueService.updateIssue(dto, claimId);
    }
}
