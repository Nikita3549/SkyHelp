import {
    Body,
    Controller,
    HttpCode,
    NotFoundException,
    Post,
    UseGuards,
} from '@nestjs/common';
import { NotificationService } from '../notification/services/notification.service';
import { SendMissingDocumentsEmailDto } from './dto/sendMissingDocumentsEmail.dto';
import { ClaimService } from '../claim/claim.service';
import { CLAIM_NOT_FOUND } from '../claim/constants';
import { Languages } from '../language/enums/languages.enums';
import { HttpStatusCode } from 'axios';
import { ApiKeyAuthGuard } from '../../common/guards/apiKeyAuthGuard';

@Controller('bot')
export class BotController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly claimService: ClaimService,
    ) {}

    @UseGuards(ApiKeyAuthGuard)
    @Post('send-missing-documents-email')
    @HttpCode(HttpStatusCode.NoContent)
    async sendMissingDocumentsEmail(@Body() dto: SendMissingDocumentsEmailDto) {
        const { claimId } = dto;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.notificationService.sendMissingDocumentEmail(
            claim.customer.email,
            {
                claimId: claim.id,
                customerName: claim.customer.firstName,
            },
            claim.customer.language as Languages,
        );
    }
}
