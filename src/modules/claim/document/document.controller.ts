import {
    Body,
    Controller,
    ForbiddenException,
    Get,
    NotFoundException,
    Param,
    Patch,
    Post,
    Query,
    Req,
    Res,
    UploadedFiles,
    UseGuards,
} from '@nestjs/common';
import { DocumentsUploadInterceptor } from '../../../interceptors/documents/documents-upload.interceptor';
import {
    CLAIM_NOT_FOUND,
    FILE_DOESNT_ON_DISK,
    INVALID_DOCUMENT_ID,
} from '../constants';
import { JwtAuthGuard } from '../../../guards/jwtAuth.guard';
import { ClaimService } from '../claim.service';
import { UploadAdminDocumentsDto } from './dto/upload-admin-documents.dto';
import { DocumentService } from './document.service';
import { GetDocumentDto } from './dto/get-document.dto';
import { Response } from 'express';
import * as path from 'path';
import * as fs from 'fs';
import { lookup as mimeLookup } from 'mime-types';
import { validateClaimJwt } from '../../../utils/validate-claim-jwt';
import { TokenService } from '../../token/token.service';
import { UploadDocumentsJwtQueryDto } from './dto/upload-documents-jwt-query.dto';
import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { UploadDocumentsQueryDto } from './dto/upload-documents-query.dto';
import { UpdateDocumentTypeDto } from './dto/update-document-type.dto';
import { IsPartnerOrLawyerOrAgentGuard } from '../../../guards/isPartnerOrLawyerOrAgentGuard';
import { MergeDocumentsDto } from './dto/merge-documents.dto';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import { ClaimRecentUpdatesType, DocumentRequestStatus } from '@prisma/client';
import { DocumentRequestService } from '../document-request/document-request.service';

@Controller('claims/documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
    constructor(
        private readonly documentService: DocumentService,
        private readonly claimService: ClaimService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly documentRequestService: DocumentRequestService,
    ) {}

    @Post('merge')
    async mergeDocuments(@Res() res: Response, @Body() dto: MergeDocumentsDto) {
        const { documentIds } = dto;

        const documents =
            await this.documentService.getDocumentByIds(documentIds);

        const files = await this.documentService.getExpressMulterFilesFromPaths(
            documents.map((d) => d.path),
        );

        const newFile = await this.documentService.mergeFiles(files);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=merged.pdf',
        });
        res.send(newFile);
    }

    @Post('admin')
    @UseGuards(IsPartnerOrLawyerOrAgentGuard)
    @DocumentsUploadInterceptor()
    async uploadAdminDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Query() query: UploadAdminDocumentsDto,
    ) {
        const { claimId, documentType } = query;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const documents = await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
            documentType,
            true,
        );

        documents.forEach((doc) => {
            this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.DOCUMENT,
                    updatedEntityId: doc.id,
                    entityData: doc.name,
                },
                claimId,
            );
        });

        return documents;
    }

    @Patch('/:documentId/admin')
    @UseGuards(IsPartnerOrLawyerOrAgentGuard)
    async updateDocumentType(
        @Body() dto: UpdateDocumentTypeDto,
        @Param('documentId') documentId: string,
    ) {
        const { type } = dto;

        return await this.documentService.updateType(type, documentId, true);
    }

    @Get('download')
    async getDocument(
        @Query() query: GetDocumentDto,
        @Req() req: AuthRequest,
        @Res() res: Response,
    ) {
        const { documentId } = query;

        const document = await this.documentService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(INVALID_DOCUMENT_ID);
        }

        const claim = await this.claimService.getClaim(document.claimId);

        if (!claim || claim.userId != req.user.id) {
            throw new ForbiddenException('You have no rights on this document');
        }

        const filePath = path.resolve(document.path);

        if (!fs.existsSync(filePath)) {
            throw new NotFoundException(FILE_DOESNT_ON_DISK);
        }
        const fileName = path.basename(filePath);
        const mimeType = mimeLookup(filePath) || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileName)}"`,
        );

        return res.download(filePath);
    }

    @Get('admin')
    @UseGuards(IsPartnerOrLawyerOrAgentGuard)
    async getDocumentAdmin(
        @Query() query: GetDocumentDto,
        @Res() res: Response,
    ) {
        const { documentId } = query;

        const document = await this.documentService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(INVALID_DOCUMENT_ID);
        }

        const filePath = path.resolve(document.path);
        if (!fs.existsSync(filePath)) {
            throw new NotFoundException(FILE_DOESNT_ON_DISK);
        }
        const fileName = path.basename(filePath);
        const mimeType = mimeLookup(filePath) || 'application/octet-stream';

        res.setHeader('Content-Type', mimeType);
        res.setHeader(
            'Content-Disposition',
            `attachment; filename="${encodeURIComponent(fileName)}"`,
        );

        return res.download(filePath);
    }

    @Post()
    @DocumentsUploadInterceptor()
    async uploadDocuments(
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Req() req: AuthRequest,
        @Query() query: UploadDocumentsQueryDto,
    ) {
        const { claimId, documentType, documentRequestId } = query;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim || claim.userId != req.user.id) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const documents = await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
            documentType,
            true,
        );

        if (documentRequestId) {
            const documentRequest =
                await this.documentRequestService.getById(documentRequestId);

            if (documentRequest) {
                await this.documentRequestService.updateStatus(
                    documentRequestId,
                    DocumentRequestStatus.INACTIVE,
                );
            }
        }

        documents.forEach((doc) => {
            this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.DOCUMENT,
                    updatedEntityId: doc.id,
                    entityData: doc.name,
                },
                claimId,
            );
        });

        return documents;
    }
}

@Controller('claims/documents/public')
export class PublicDocumentController {
    constructor(
        private readonly documentService: DocumentService,
        private readonly claimService: ClaimService,
        private readonly tokenService: TokenService,
    ) {}

    @Post()
    @DocumentsUploadInterceptor()
    async uploadDocuments(
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Query() query: UploadDocumentsJwtQueryDto,
    ) {
        const { jwt, claimId, step, documentType } = query;

        await validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        if (!(await this.claimService.getClaim(claimId))) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.claimService.updateStep(claimId, step);

        return await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
            documentType,
            true,
        );
    }
}
