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
import { JwtAuthGuard } from '../../../common/guards/jwtAuth.guard';
import { GetDocumentRequestsQuery } from './dto/get-document-requests.query';
import { CLAIM_NOT_FOUND, HAVE_NO_RIGHTS_ON_CLAIM } from '../constants';
import { AuthRequest } from '../../../common/interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';
import { DOCUMENT_REQUEST_NOT_FOUND } from './constants';
import { HttpStatusCode } from 'axios';
import { RedisService } from '../../redis/redis.service';
import { DAY } from '../../../common/constants/time.constants';
import { RoleGuard } from '../../../common/guards/role.guard';
import { ClaimPersistenceService } from '../../claim-persistence/services/claim-persistence.service';

@Controller('claims/document-requests')
@UseGuards(JwtAuthGuard)
export class DocumentRequestController {
    constructor(
        private readonly documentRequestService: DocumentRequestService,
        private readonly redis: RedisService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @Post()
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
        ]),
    )
    async create(
        @Body() dto: CreateDocumentRequestDto,
        @Req() req: AuthRequest,
    ) {
        const claim = await this.claimPersistenceService.findOneById(
            dto.claimId,
        );

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        if (req.user.role != UserRole.ADMIN && claim.agentId != req.user.id) {
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

        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        if (
            (req.user.role == UserRole.CLIENT && claim.userId != req.user.id) ||
            (req.user.role != UserRole.ADMIN && claim.agentId != req.user.id)
        ) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
        }

        return this.documentRequestService.getByClaimId(claimId);
    }

    @Delete(':documentRequestId')
    @HttpCode(HttpStatusCode.NoContent)
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
        ]),
    )
    async delete(
        @Req() req: AuthRequest,
        @Param('documentRequestId') documentRequestId: string,
    ) {
        const documentRequest =
            await this.documentRequestService.getById(documentRequestId);

        if (!documentRequest) {
            throw new NotFoundException(DOCUMENT_REQUEST_NOT_FOUND);
        }

        const claim = await this.claimPersistenceService.findOneById(
            documentRequest.claimId,
        );

        if (!claim) {
            return;
        }

        if (req.user.role != UserRole.ADMIN && claim.agentId != req.user.id) {
            throw new ForbiddenException(HAVE_NO_RIGHTS_ON_CLAIM);
        }

        await this.documentRequestService.delete(documentRequestId);
    }
}
