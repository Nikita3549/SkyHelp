import {
    Body,
    Controller,
    Injectable,
    NotFoundException,
    Post,
    Query,
    UnauthorizedException,
} from '@nestjs/common';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { JwtQueryDto } from '../../dto/jwt-query.dto';
import { CLAIM_NOT_FOUND, INVALID_JWT } from '../../constants';
import { PaymentService } from '../payment.service';
import { TokenService } from '../../../token/token.service';
import { ActivityService } from '../../activity/activity.service';
import { ClaimActivityType } from '@prisma/client';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';

@Injectable()
@Controller('claims/payment')
export class PaymentPublicController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly tokenService: TokenService,
        private readonly activityService: ActivityService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @Post()
    async addPayment(
        @Body() dto: UpdatePaymentDto,
        @Query() query: JwtQueryDto,
    ) {
        const { jwt } = query;

        const payload = await this.tokenService.verifyJWT(jwt);

        if (!payload || !payload?.claimId) {
            throw new UnauthorizedException(INVALID_JWT);
        }
        const claimId = payload.claimId;

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.tokenService.revokeJwt(payload);

        await this.claimPersistenceService.update(
            { updatedAt: new Date() },
            claimId,
        );

        await this.claimPersistenceService.updateIsPaymentRequested(
            { isPaymentRequested: false },
            claimId,
        );

        await this.paymentService.setBlockPaymentRequests(claimId, true);

        await this.activityService.saveActivity(
            {
                title: 'Payment details updated',
                description: `New payment details were added`,
                type: ClaimActivityType.PAYMENT_UPDATED,
            },
            claimId,
        );

        return await this.paymentService.updatePayment(dto, claimId);
    }
}
