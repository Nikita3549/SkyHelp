import {
    BadRequestException,
    Controller,
    Get,
    NotFoundException,
    Query,
    UseGuards,
} from '@nestjs/common';
import { JwtOrApiKeyAuth } from '../../common/guards/jwtOrApiKeyAuth';
import { ClaimPersistenceService } from '../claim-persistence/services/claim-persistence.service';
import { AiDataGetLettersDto } from './dto/ai-data-get-letters.dto';
import { CLAIM_NOT_FOUND } from '../claim/constants';
import { EmailService } from '../email/email.service';

@Controller('letters/ai-data')
@UseGuards(JwtOrApiKeyAuth)
export class AiDataLetterController {
    constructor(
        private readonly claimPersistenceService: ClaimPersistenceService,
        private readonly emailService: EmailService,
    ) {}

    @Get()
    async getLetters(@Query() dto: AiDataGetLettersDto) {
        const { claimId } = dto;

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        return await this.emailService.getEmails({
            page: 1,
            pageSize: 100,
            claimId,
        });
    }
}
