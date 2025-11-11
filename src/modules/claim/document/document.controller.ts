import {
    BadRequestException,
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
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
    DOCUMENT_NOT_FOUND,
    FILE_DOESNT_ON_DISK,
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
import { IsAgentOrLawyerGuardOrPartnerOrAccountant } from '../../../guards/isAgentOrLawyerGuardOrPartnerOrAccountant';
import { MergeDocumentsDto } from './dto/merge-documents.dto';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import {
    ClaimRecentUpdatesType,
    DocumentRequestStatus,
    DocumentType,
} from '@prisma/client';
import { DocumentRequestService } from '../document-request/document-request.service';
import { PatchPassengerIdDto } from './dto/patch-passenger-id.dto';
import { HttpStatusCode } from 'axios';

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

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=merged.pdf',
        });

        const mergedStream = await this.documentService.mergeFiles(files);
        mergedStream.pipe(res);
    }

    @Delete(':documentId/admin')
    @HttpCode(HttpStatusCode.NoContent)
    @UseGuards(IsAgentOrLawyerGuardOrPartnerOrAccountant)
    async removeDocument(@Param('documentId') documentId: string) {
        const document = await this.documentService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(DOCUMENT_NOT_FOUND);
        }

        await this.documentService.removeDocument(document.id);
    }

    @Post('admin')
    @UseGuards(IsAgentOrLawyerGuardOrPartnerOrAccountant)
    @DocumentsUploadInterceptor()
    async uploadAdminDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Query() query: UploadAdminDocumentsDto,
    ) {
        const { claimId, documentType, passengerId } = query;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const documents = await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                    passengerId,
                    documentType,
                };
            }),
            claimId,
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
    @UseGuards(IsAgentOrLawyerGuardOrPartnerOrAccountant)
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
            throw new NotFoundException(DOCUMENT_NOT_FOUND);
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
    @UseGuards(IsAgentOrLawyerGuardOrPartnerOrAccountant)
    async getDocumentAdmin(
        @Query() query: GetDocumentDto,
        @Res() res: Response,
    ) {
        const { documentId } = query;

        const document = await this.documentService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(DOCUMENT_NOT_FOUND);
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
        const { claimId, documentType, documentRequestId, passengerId } = query;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim || claim.userId != req.user.id) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const documents = await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                    passengerId,
                    documentType,
                };
            }),
            claimId,
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

    @UseGuards(IsAgentOrLawyerGuardOrPartnerOrAccountant)
    @Patch('admin/passenger')
    async patchPassengerId(@Body() dto: PatchPassengerIdDto) {
        const { passengerId, documentId } = dto;

        return await this.documentService.updatePassengerId(
            documentId,
            passengerId,
        );
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
        @Body('documentTypes') documentTypes: string,
    ) {
        const { jwt, claimId, step, passengerId } = query;

        let parsed: DocumentType[];

        try {
            parsed = JSON.parse(documentTypes);
        } catch {
            throw new BadRequestException('Invalid JSON in documentTypes');
        }

        const allowedValues = Object.values(DocumentType);
        const invalid = parsed.filter((v) => !allowedValues.includes(v));
        if (invalid.length > 0) {
            throw new BadRequestException(
                `Invalid documentTypes: ${invalid.join(', ')}`,
            );
        }

        if (!parsed || parsed.length != files.length) {
            throw new BadRequestException(
                'Files count must match documentTypes count',
            );
        }

        await validateClaimJwt(
            jwt,
            claimId,
            this.tokenService.verifyJWT.bind(this.tokenService),
        );

        if (!(await this.claimService.getClaim(claimId))) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        if (step) {
            await this.claimService.updateStep(claimId, step);
        }

        return await this.documentService.saveDocuments(
            files.map((doc, index) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                    passengerId,
                    documentType: parsed[index],
                };
            }),
            claimId,
            true,
        );
    }
}
