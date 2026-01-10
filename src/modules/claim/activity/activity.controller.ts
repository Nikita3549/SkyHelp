import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { AuthRequest } from '../../../common/interfaces/AuthRequest.interface';
import { GetActivitiesQuery } from './dto/get-activities.query';
import { UserRole } from '@prisma/client';
import { ForbiddenException } from '@nestjs/common/exceptions/forbidden.exception';
import { CLAIM_NOT_FOUND, HAVE_NO_RIGHTS_ON_CLAIM } from '../constants';
import { BadRequestException } from '@nestjs/common/exceptions/bad-request.exception';
import { ActivityService } from './activity.service';
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';

@Controller('activities')
@UseGuards(JwtAuthGuard)
export class ActivityController {
    constructor(
        private readonly activityService: ActivityService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @Get()
    async getActivities(
        @Req() req: AuthRequest,
        @Query() query: GetActivitiesQuery,
    ) {
        const { claimId, page } = query;

        if (req.user.role != UserRole.ADMIN) {
            if (!claimId) {
                throw new BadRequestException(CLAIM_NOT_FOUND);
            }

            const claim =
                await this.claimPersistenceService.findOneById(claimId);

            if (!claim || claim.id != claimId) {
                throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
            }
        }

        return this.activityService.getActivities(page, {
            claimId,
        });
    }
}
