import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    NotFoundException,
    Param,
    Post,
    Query,
    Req,
    UseGuards,
} from '@nestjs/common';
import { DocumentRequestService } from './document-request.service';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { GetDocumentRequestsQuery } from './dto/get-document-requests.query';
import { ClaimService } from '../claim.service';
import { HAVE_NO_RIGHTS_ON_CLAIM, INVALID_CLAIM_ID } from '../constants';
import { IsPartnerOrLawyerOrAgentGuard } from '../../../guards/isPartnerOrLawyerOrAgentGuard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';
import { INVALID_DOCUMENT_REQUEST } from './constants';
import { IFullClaim } from '../interfaces/full-claim.interface';
import { HttpStatusCode } from 'axios';
import { RedisService } from '../../redis/redis.service';
import { DAY } from '../../../common/constants/time.constants';

@Controller('claims/document-requests')
@UseGuards(JwtAuthGuard)
export class DocumentRequestController {
    constructor(
        private readonly documentRequestService: DocumentRequestService,
        private readonly redis: RedisService,
        private readonly claimService: ClaimService,
    ) {}

    @Post()
    @UseGuards(IsPartnerOrLawyerOrAgentGuard)
    async create(
        @Body() dto: CreateDocumentRequestDto,
        @Req() req: AuthRequest,
    ) {
        const claim = await this.claimService.getClaim(dto.claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        if (req.user.role != UserRole.ADMIN && claim.partnerId != req.user.id) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
        }

        const isLocked = await this.redis.get(
            `claim:${claim.id}:docs_request_email_lock`,
        );

        if (!isLocked) {
            await this.documentRequestService.scheduleSendNewDocumentRequests(
                claim,
            );

            await this.redis.set(
                `claim:${claim.id}:docs_request_email_lock`,
                1,
                'PX',
                DAY * 12,
            );
        }

        return this.documentRequestService.create(dto);
    }

    @Get()
    async findAll(
        @Query() query: GetDocumentRequestsQuery,
        @Req() req: AuthRequest,
    ) {
        const { claimId } = query;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
        }

        if (
            (req.user.role == UserRole.CLIENT && claim.userId != req.user.id) ||
            (req.user.role != UserRole.ADMIN && claim.partnerId != req.user.id)
        ) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
        }

        return this.documentRequestService.getByClaimId(claimId);
    }

    @Delete(':documentRequestId')
    @HttpCode(HttpStatusCode.NoContent)
    @UseGuards(IsPartnerOrLawyerOrAgentGuard)
    async delete(
        @Req() req: AuthRequest,
        @Param('documentRequestId') documentRequestId: string,
    ) {
        const documentRequest =
            await this.documentRequestService.getById(documentRequestId);

        if (!documentRequest) {
            throw new NotFoundException(INVALID_DOCUMENT_REQUEST);
        }

        const claim = (await this.claimService.getClaim(
            documentRequest.claimId,
        )) as IFullClaim;

        if (req.user.role != UserRole.ADMIN && claim.partnerId != req.user.id) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
        }

        await this.documentRequestService.delete(documentRequestId);
    }
}
