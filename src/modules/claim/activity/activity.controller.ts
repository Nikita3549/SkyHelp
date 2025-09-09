import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { GetActivitiesQuery } from './dto/get-activities.query';
import { UserRole } from '@prisma/client';
import { ClaimService } from '../claim.service';
import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception';
import { DONT_HAVE_RIGHTS_ON_CLAIM, INVALID_CLAIM_ID } from '../constants';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';
import { ActivityService } from './activity.service';

@Controller('activities')
@UseGuards()
export class ActivityController {
    constructor(
        private readonly claimService: ClaimService,
        private readonly activityService: ActivityService,
    ) {}

    @Get()
    async getActivities(
        @Req() req: AuthRequest,
        @Query() query: GetActivitiesQuery,
    ) {
        const { claimId, page } = query;

        if (req.user.role != UserRole.ADMIN) {
            if (!claimId) {
                throw new BadRequestException(INVALID_CLAIM_ID);
            }

            const claim = await this.claimService.getClaim(claimId);

            if (!claim || claim.id != claimId) {
                throw new ForbiddenException(DONT_HAVE_RIGHTS_ON_CLAIM);
            }
        }

        return this.activityService.getActivities(page, {
            claimId,
        });
    }
}
