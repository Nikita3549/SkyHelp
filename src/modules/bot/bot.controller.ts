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
import { MissingDocumentsLetter } from '../notification/letters/definitions/claim/missing-documents.letter';
import { ConfigService } from '@nestjs/config';
import { ClaimPersistenceService } from '../claim-persistence/services/claim-persistence.service';

@Controller('bot')
export class BotController {
    constructor(
        private readonly notificationService: NotificationService,
        private readonly configService: ConfigService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @UseGuards(ApiKeyAuthGuard)
    @Post('send-missing-documents-email')
    @HttpCode(HttpStatusCode.NoContent)
    async sendMissingDocumentsEmail(@Body() dto: SendMissingDocumentsEmailDto) {
        const { claimId } = dto;

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.notificationService.sendLetter(
            new MissingDocumentsLetter({
                to: claim.customer.email,
                claimId: claim.id,
                customerName: claim.customer.firstName,
                language: claim.customer.language as Languages,
                dashboardLink: `${this.configService.getOrThrow('FRONTEND_URL')}/dashboard`,
            }),
        );
    }
}
