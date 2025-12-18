import {
    Body,
    Controller,
    Injectable,
    Post,
    Query,
    UnauthorizedException,
} from '@nestjs/common';
import { UpdatePaymentDto } from '../dto/update-payment.dto';
import { JwtQueryDto } from '../../dto/jwt-query.dto';
import { INVALID_JWT } from '../../constants';
import { PaymentService } from '../payment.service';
import { TokenService } from '../../../token/token.service';
import { ClaimService } from '../../claim.service';

@Injectable()
@Controller('claims/payment')
export class PaymentPublicController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly tokenService: TokenService,
        private readonly claimService: ClaimService,
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
        await this.tokenService.revokeJwt(payload);

        await this.claimService.changeUpdatedAt(payload.claimId);

        return await this.paymentService.updatePayment(dto, payload.claimId);
    }
}
