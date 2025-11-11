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
import { UserRole } from '@prisma/client';
import { RoleGuard } from '../../../guards/role.guard';

@Controller('claims/issue')
@UseGuards(JwtAuthGuard)
export class IssueController {
    constructor(
        private readonly issueService: IssueService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.AGENT]))
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
