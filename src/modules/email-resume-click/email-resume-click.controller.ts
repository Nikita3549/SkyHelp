import {
    Body,
    Controller,
    HttpCode,
    NotFoundException,
    Put,
} from '@nestjs/common';
import { validateClaimJwt } from '../../utils/validate-claim-jwt';
import { SaveClickDto } from './dto/save-click.dto';
import { TokenService } from '../token/token.service';
import { EmailResumeClickService } from './email-resume-click.service';
import { HttpStatusCode } from 'axios';
import { NO_RECORD } from './constants';

@Controller('track/email')
export class EmailResumeClickController {
    constructor(
        private readonly tokenService: TokenService,
        private readonly emailResumeClickService: EmailResumeClickService,
    ) {}

    @Put()
    @HttpCode(HttpStatusCode.NoContent)
    async saveClick(@Body() dto: SaveClickDto) {
        const { claimId, jwt } = dto;

        validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        const record =
            await this.emailResumeClickService.getRecordByClaimId(claimId);

        if (!record) {
            throw new NotFoundException(NO_RECORD);
        }

        await this.emailResumeClickService.saveClick(claimId);
    }
}
