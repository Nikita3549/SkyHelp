import {
    BadRequestException,
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
import { DocumentsUploadInterceptor } from '../../../interceptors/documents/documents-upload.interceptor';
import {
    CLAIM_NOT_FOUND,
    DOCUMENT_NOT_FOUND,
    FILE_DOESNT_ON_DISK,
    PASSENGER_NOT_FOUND,
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
import { MergeDocumentsDto } from './dto/merge-documents.dto';
import { RecentUpdatesService } from '../recent-updates/recent-updates.service';
import {
    ClaimRecentUpdatesType,
    DocumentRequestStatus,
    DocumentType,
    UserRole,
} from '@prisma/client';
import { DocumentRequestService } from '../document-request/document-request.service';
import { PatchPassengerIdDto } from './dto/patch-passenger-id.dto';
import { HttpStatusCode } from 'axios';
import { RoleGuard } from '../../../guards/role.guard';
import { GenerateAssignmentDto } from './dto/generate-assignment.dto';
import { formatDate } from '../../../utils/formatDate';

@Controller('claims/documents')
@UseGuards(JwtAuthGuard)
export class DocumentController {
    constructor(
        private readonly documentService: DocumentService,
        private readonly claimService: ClaimService,
        private readonly recentUpdatesService: RecentUpdatesService,
        private readonly documentRequestService: DocumentRequestService,
    ) {}

    @Post('assignment')
    @UseGuards(new RoleGuard([UserRole.ADMIN, UserRole.LAWYER, UserRole.AGENT]))
    async generateAssignment(@Body() dto: GenerateAssignmentDto) {
        const { passengerId } = dto;

        const passenger =
            await this.claimService.getCustomerOrOtherPassengerById(
                passengerId,
            );

        if (!passenger) {
            throw new NotFoundException(PASSENGER_NOT_FOUND);
        }

        const claim = await this.claimService.getClaim(passenger.claimId);

        if (!claim) {
            console.error(`Passenger ${passengerId} has invalid claimId`);
            throw new InternalServerErrorException('Known error, check logs');
        }

        const oldAssignment = (
            await this.documentService.getDocumentsByPassengerId(passengerId)
        ).find(
            (d) =>
                d.type == DocumentType.ASSIGNMENT &&
                !d.name?.includes('updated'),
        );

        if (!oldAssignment) {
            throw new NotFoundException('Passenger has no assignments');
        }

        let assignmentFilePath;
        if (!passenger.isMinor) {
            assignmentFilePath = await this.documentService.updateAssignment(
                oldAssignment.path,
                {
                    claimId: claim.id,
                    airlineName: claim.details.airlines.name,
                    address: passenger.address,
                    lastName: passenger.lastName,
                    firstName: passenger.firstName,
                    date: claim.details.date,
                    flightNumber: claim.details.flightNumber,
                },
                claim.createdAt <= new Date('2025-10-09'),
            );
        } else {
            assignmentFilePath =
                await this.documentService.updateParentalAssignment(
                    oldAssignment.path,
                    {
                        claimId: claim.id,
                        airlineName: claim.details.airlines.name,
                        address: passenger.address,
                        lastName: passenger.lastName,
                        firstName: passenger.firstName,
                        date: claim.details.date,
                        flightNumber: claim.details.flightNumber,
                        parentFirstName: passenger.parentFirstName!,
                        parentLastName: passenger.lastName!,
                        minorBirthday: passenger.birthday!,
                    },
                );
        }

        return (
            await this.documentService.saveDocuments(
                [
                    {
                        name: `updated_${passenger.firstName}_${passenger.lastName}-${formatDate(claim.details.date, 'dd.mm.yyyy')}-assignment_agreement.pdf`,
                        path: assignmentFilePath,
                        documentType: DocumentType.ASSIGNMENT,
                        passengerId: passenger.id,
                    },
                ],
                claim.id,
                true,
            )
        )[0];
    }

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
