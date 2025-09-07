import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
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
import { DONT_HAVE_RIGHTS_ON_CLAIM, INVALID_CLAIM_ID } from '../constants';
import { IsPartnerOrAgentGuard } from '../../../guards/isPartnerOrAgentGuard';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';

@Controller('claims/document-requests')
@UseGuards(JwtAuthGuard)
export class DocumentRequestController {
    constructor(
        private readonly documentRequestService: DocumentRequestService,
        private readonly claimService: ClaimService,
    ) {}

    @Post()
    @UseGuards(IsPartnerOrAgentGuard)
    async create(@Body() dto: CreateDocumentRequestDto) {
        const claim = await this.claimService.getClaim(dto.claimId);

        if (!claim) {
            throw new NotFoundException(INVALID_CLAIM_ID);
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

        if (req.user.role == UserRole.CLIENT && claim.userId != req.user.id) {
            throw new ForbiddenException(DONT_HAVE_RIGHTS_ON_CLAIM);
        }

        return this.documentRequestService.getByClaimId(claimId);
    }
}
