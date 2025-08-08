import {
    Body,
    Controller,
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
import { IsModeratorGuard } from '../../../guards/isModerator.guard';
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
import { GetDocumentAdminDto } from './dto/get-document-admin.dto';
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

@Controller('claims/documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
    constructor(
        private readonly documentService: DocumentService,
        private readonly claimService: ClaimService,
    ) {}
    @Post('admin')
    @UseGuards(IsModeratorGuard)
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

        return await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
            documentType,
        );
    }

    @Patch('/:documentId/admin')
    @UseGuards(IsModeratorGuard)
    async updateDocumentType(
        @Body() dto: UpdateDocumentTypeDto,
        @Param('documentId') documentId: string,
    ) {
        const { type } = dto;

        return await this.documentService.updateType(type, documentId);
    }

    @Get('admin')
    @UseGuards(IsModeratorGuard)
    async getDocumentAdmin(
        @Query() query: GetDocumentAdminDto,
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
        const { claimId, documentType } = query;

        const claim = await this.claimService.getClaim(claimId);

        if (!claim || claim.userId != req.user.id) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        return await this.documentService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
            documentType,
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
    ) {
        const { jwt, claimId, step, documentType } = query;

        validateClaimJwt(
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
        );
    }
}
