import {
    BadRequestException,
    Body,
    Controller,
    Put,
    UseGuards,
} from '@nestjs/common';
import { PaymentDto } from './dto/payment.dto';
import { CLAIM_NOT_FOUND } from '../constants';
import { PaymentService } from './payment.service';
import { ClaimService } from '../claim.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { IsAgentGuard } from '../../../guards/isAgent.guard';

@Controller('claims/payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsAgentGuard)
    @Put('admin')
    async updatePayment(@Body() dto: PaymentDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(CLAIM_NOT_FOUND);
        }

        await this.claimService.changeUpdatedAt(claimId);

        return await this.paymentService.updatePayment(dto, claimId);
    }
}
