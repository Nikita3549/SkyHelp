import {
    BadRequestException,
    Body,
    Controller,
    HttpCode,
    NotFoundException,
    Post,
    UseGuards,
} from '@nestjs/common';
import { ApiKeyAuthGuard } from '../../guards/ApiKeyAuthGuard';
import { NotificationService } from '../notification/notification.service';
import { SendMissingDocumentsEmailDto } from './dto/sendMissingDocumentsEmail.dto';
import { ClaimService } from '../claim/claim.service';
import { INVALID_CLAIM_ID } from '../claim/constants';
import { Languages } from '../language/enums/languages.enums';
import { HttpStatusCode } from 'axios';

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
            throw new NotFoundException(INVALID_CLAIM_ID);
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
