import {
    Body,
    Controller,
    Delete,
    ForbiddenException,
    Get,
    HttpCode,
    InternalServerErrorException,
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
import { DocumentsUploadInterceptor } from '../../../../common/interceptors/documents/documents-upload.interceptor';
import { CLAIM_NOT_FOUND, DOCUMENT_NOT_FOUND } from '../../constants';
import { JwtAuthGuard } from '../../../../common/guards/jwtAuth.guard';
import { ClaimService } from '../../claim.service';
import { UploadAdminDocumentsDto } from '../dto/upload-admin-documents.dto';
import { DocumentService } from '../services/document.service';
import { GetDocumentDto } from '../dto/get-document.dto';
import { Response } from 'express';
import { AuthRequest } from '../../../../common/interfaces/AuthRequest.interface';
import { UploadDocumentsQueryDto } from '../dto/upload-documents-query.dto';
import { UpdateDocumentTypeDto } from '../dto/update-document-type.dto';
import { MergeDocumentsDto } from '../dto/merge-documents.dto';
import { RecentUpdatesService } from '../../recent-updates/recent-updates.service';
import {
    ClaimRecentUpdatesType,
    DocumentRequestStatus,
    UserRole,
} from '@prisma/client';
import { DocumentRequestService } from '../../document-request/document-request.service';
import { PatchPassengerIdDto } from '../dto/patch-passenger-id.dto';
import { HttpStatusCode } from 'axios';
import { RoleGuard } from '../../../../common/guards/role.guard';
import { ISignedUrlResponse } from './interfaces/signed-url-response.interface';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';

@Controller('claims/documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
    constructor(
        private readonly documentService: DocumentService,
        private readonly claimService: ClaimService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly documentRequestService: DocumentRequestService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    @Post('merge')
    async mergeDocuments(@Res() res: Response, @Body() dto: MergeDocumentsDto) {
        const { documentIds } = dto;
        const documents =
            await this.documentService.getDocumentByIds(documentIds);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename=merged.pdf',
        });

        const mergedStream = await this.documentService.mergeFiles(documents);
        mergedStream.pipe(res);
    }

    @Delete(':documentId/admin')
    @HttpCode(HttpStatusCode.NoContent)
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    async removeDocument(@Param('documentId') documentId: string) {
        const document = await this.documentService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(DOCUMENT_NOT_FOUND);
        }

        await this.documentService.removeDocument(document.id);
    }

    @Post('admin')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    @DocumentsUploadInterceptor()
    async uploadAdminDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Query() query: UploadAdminDocumentsDto,
    ) {
        const { claimId, documentType, passengerId } = query;

        const claim = await this.claimPersistenceService.findOneById(claimId);

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
                    buffer: doc.buffer,
                    mimetype: doc.mimetype,
                };
            }),
            claimId,
            {
                isPublic: true,
            },
        );

        documents.forEach((doc) => {
            this.recentUpdatesService.saveRecentUpdate(
                {
                    type: ClaimRecentUpdatesType.DOCUMENT,
                    updatedEntityId: doc.id,
                    entityData: doc.name,
                    documentType: doc.type,
                },
                claimId,
            );
        });

        return documents;
    }

    @Patch(':documentId/admin')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    async updateDocumentType(
        @Body() dto: UpdateDocumentTypeDto,
        @Param('documentId') documentId: string,
    ) {
        const { type } = dto;

        return this.documentService.updateDocument(
            {
                type,
            },
            documentId,
            true,
        );
    }

    @Get('signed-url')
    async getDocument(
        @Query() query: GetDocumentDto,
        @Req() req: AuthRequest,
    ): Promise<ISignedUrlResponse> {
        const { documentId, disposition } = query;

        const document = await this.documentService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(DOCUMENT_NOT_FOUND);
        }

        const claim = await this.claimPersistenceService.findOneById(
            document.claimId,
        );

        if (!claim || claim.userId != req.user.id) {
            throw new ForbiddenException('You have no rights on this document');
        }

        if (!document.s3Key) {
            throw new InternalServerErrorException(
                'Server cant find s3Key for this document',
            );
        }

        const { signedUrl } = await this.documentService.getSignedUrl(
            document.s3Key,
            {
                disposition,
            },
        );

        return {
            signedUrl,
            contentType: document.mimetype,
        };
    }

    @Get('signed-url/admin')
    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    async getDocumentAdmin(
        @Query() query: GetDocumentDto,
    ): Promise<ISignedUrlResponse> {
        const { documentId, disposition } = query;

        const document = await this.documentService.getDocument(documentId);

        if (!document) {
            throw new NotFoundException(DOCUMENT_NOT_FOUND);
        }

        if (!document.s3Key) {
            throw new InternalServerErrorException(
                'Server cant find s3Key for this document',
            );
        }

        const { signedUrl } = await this.documentService.getSignedUrl(
            document.s3Key,
            {
                disposition,
            },
        );

        return {
            signedUrl,
            contentType: document.mimetype,
        };
    }

    @Post()
    @DocumentsUploadInterceptor()
    async uploadDocuments(
        @UploadedFiles() files: Express.Multer.File[] = [],
        @Req() req: AuthRequest,
        @Query() query: UploadDocumentsQueryDto,
    ) {
        const { claimId, documentType, documentRequestId, passengerId } = query;

        const claim = await this.claimPersistenceService.findOneById(claimId);

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
                    buffer: doc.buffer,
                    mimetype: doc.mimetype,
                };
            }),
            claimId,
            {
                isPublic: true,
                handleIsAllDocumentsUploaded: true,
            },
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
                    documentType: doc.type,
                },
                claimId,
            );
        });

        return documents;
    }

    @UseGuards(
        new RoleGuard([
            UserRole.ADMIN,
            UserRole.LAWYER,
            UserRole.AGENT,
            UserRole.PARTNER,
            UserRole.ACCOUNTANT,
        ]),
    )
    @Patch('admin/passenger')
    async patchPassengerId(@Body() dto: PatchPassengerIdDto) {
        const { passengerId, documentId } = dto;

        return this.documentService.updateDocument(
            {
                passengerId,
            },
            documentId,
            true,
        );
    }
}
