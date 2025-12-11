import {
    BadRequestException,
    Body,
    Controller,
    NotFoundException,
    Post,
    Query,
    UploadedFiles,
} from '@nestjs/common';
import { DocumentService } from '../services/document.service';
import { ClaimService } from '../../claim.service';
import { TokenService } from '../../../token/token.service';
import { DocumentsUploadInterceptor } from '../../../../interceptors/documents/documents-upload.interceptor';
import { UploadDocumentsJwtQueryDto } from '../dto/upload-documents-jwt-query.dto';
import { DocumentType } from '@prisma/client';
import { validateClaimJwt } from '../../../../utils/validate-claim-jwt';
import { CLAIM_NOT_FOUND } from '../../constants';

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
