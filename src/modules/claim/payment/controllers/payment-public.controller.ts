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
import { ClaimService } from '../../claim.service';
import { ActivityService } from '../../activity/activity.service';
import { ClaimActivityType } from '@prisma/client';

@Injectable()
@Controller('claims/payment')
export class PaymentPublicController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly tokenService: TokenService,
        private readonly claimService: ClaimService,
        private readonly activityService: ActivityService,
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

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.tokenService.revokeJwt(payload);

        await this.claimService.changeUpdatedAt(claimId);

        await this.claimService.updateIsPaymentRequested(false, claimId);

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
