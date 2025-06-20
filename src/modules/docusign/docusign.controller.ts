import {
    BadRequestException,
    Body,
    Controller,
    Get,
    HttpCode,
    HttpStatus,
    Param,
    Post,
    Req,
    Res,
    UnauthorizedException,
    UseGuards,
} from '@nestjs/common';
import { GenerateUrlDto } from './dto/generate-url.dto';
import { DocusignService } from './docusign.service';
import { IClaimJwt } from '../claims/interfaces/claim-jwt.interface';
import { INVALID_JWT } from '../claims/constants';
import { TokenService } from '../token/token.service';
import { IWebhookRequest } from './interfaces/webhook.request';
import { IsDocusignGuard } from './guards/isDocusign.guard';
import { Request, Response } from 'express';
import { ClaimsService } from '../claims/claims.service';
import { INVALID_CLAIM_ID } from './constants';

@Controller('docusign')
export class DocusignController {
    constructor(
        private readonly docusignService: DocusignService,
        private readonly tokenService: TokenService,
        private readonly claimService: ClaimsService,
    ) {}

    @Post('/url/generate')
    async generateSignUrl(@Body() dto: GenerateUrlDto) {
        try {
            const { claimId, jwt } = dto;

            const { claimId: jwtClaimId } =
                this.tokenService.verifyJWT<IClaimJwt>(jwt);

            if (claimId != jwtClaimId) {
                throw new UnauthorizedException(INVALID_JWT);
            }

            const claim = await this.claimService.getClaim(claimId);

            if (!claim) {
                throw new BadRequestException(INVALID_CLAIM_ID);
            }

            const { envelopeId } = await this.docusignService.createEnvelope({
                claimId,
                customerEmail: claim.customer.email,
                customerName: `${claim.customer.firstName} ${claim.customer.lastName}`,
                labels: {
                    assignmentDate: new Date().toISOString().slice(0, 10),
                    clientAddress: claim.customer.address,
                    flightAirline: claim.details.airlines.name,
                    flightNumber: claim.details.flightNumber,
                    flightDate: claim.details.date.toISOString().slice(0, 10),
                },
            });

            await this.claimService.updateEnvelopeId(claimId, envelopeId);

            const { url } = await this.docusignService.getSignUrl({
                claimId,
                customerEmail: claim.customer.email,
                customerName: `${claim.customer.firstName} ${claim.customer.lastName}`,
                envelopeId,
            });

            return { url };
        } catch (e: unknown) {
            if (e instanceof Error) {
                if (
                    e.message == 'invalid token' ||
                    e.message == 'jwt expired'
                ) {
                    throw new UnauthorizedException();
                }
            }
            throw e;
        }
    }

    @Post('webhook')
    @HttpCode(HttpStatus.OK)
    @UseGuards(IsDocusignGuard)
    async handleWebhook(@Req() req: Request) {
        const body: IWebhookRequest = JSON.parse(req.body.toString('utf-8'));
        const envelopeId = body?.data?.envelopeId;

        const claim = await this.claimService.getClaimByEnvelopeId(
            body.data.envelopeId,
        );

        if (!claim) {
            console.warn('Invalid envelope id');
            return;
        }

        if (
            !!(await this.claimService.doesAssignmentAgreementExist(claim.id))
        ) {
            console.warn('agreement already exist');
            return;
        }

        if (body.data.envelopeSummary.status != 'completed') {
            console.warn('status not competed');
            return;
        }

        const { filePath } =
            await this.docusignService.getAndSaveDocument(envelopeId);

        const fileName = body.data.envelopeSummary.envelopeDocuments[0].name;

        this.claimService.saveDocuments(
            [{ name: fileName, path: filePath }],
            claim.id,
        );
    }

    @Get('/:claimId/is-signed')
    async isSigned(@Param('claimId') claimId: string) {
        return {
            isSigned:
                !!(await this.claimService.doesAssignmentAgreementExist(
                    claimId,
                )),
        };
    }
}
