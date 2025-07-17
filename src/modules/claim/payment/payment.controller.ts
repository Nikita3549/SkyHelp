import {
    BadRequestException,
    Body,
    Controller,
    Param,
    Put,
    UseGuards,
} from '@nestjs/common';
import { IsModeratorGuard } from '../../../guards/isModerator.guard';
import { PaymentDto } from './dto/payment.dto';
import { INVALID_CLAIM_ID } from '../constants';
import { PaymentService } from './payment.service';
import { ClaimService } from '../claim.service';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';

@Controller('claims/payment')
@UseGuards(JwtAuthGuard)
export class PaymentController {
    constructor(
        private readonly paymentService: PaymentService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(IsModeratorGuard)
    @Put('admin')
    async updatePayment(@Body() dto: PaymentDto) {
        const { claimId } = dto;

        if (!(await this.claimService.getClaim(claimId))) {
            throw new BadRequestException(INVALID_CLAIM_ID);
        }

        await this.claimService.changeUpdatedAt(claimId);

        return await this.paymentService.updatePayment(dto, claimId);
    }
}
