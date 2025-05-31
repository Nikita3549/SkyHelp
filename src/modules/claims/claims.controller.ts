import {
    Body,
    Controller,
    NotFoundException,
    Param,
    Post,
    Req,
    UploadedFiles,
    UseGuards,
} from '@nestjs/common';
import { CreateClaimDto } from './dto/create-claim.dto';
import { DocumentsUploadInterceptor } from '../../interceptors/documents/documents-upload.interceptor';
import { ClaimsService } from './claims.service';
import { CLAIM_NOT_FOUND, SAVE_DOCUMENTS_SUCCESS } from './constants';
import { JwtAuthGuard } from '../../guards/jwtAuth.guard';
import { AuthRequest } from '../../interfaces/AuthRequest.interface';
import { Claim } from '@prisma/client';

@Controller('claims')
@UseGuards(JwtAuthGuard)
export class ClaimsController {
    constructor(private readonly claimsService: ClaimsService) {}
    @Post('/:claimId/documents')
    @DocumentsUploadInterceptor()
    async uploadDocuments(
        @UploadedFiles() files: Express.Multer.File[],
        @Param('claimId') claimId: string,
    ) {
        if (!(await this.claimsService.getClaim(claimId))) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        await this.claimsService.saveDocuments(
            files.map((doc) => {
                return {
                    name: doc.originalname,
                    path: doc.path,
                };
            }),
            claimId,
        );

        return SAVE_DOCUMENTS_SUCCESS;
    }

    @Post()
    async create(
        @Body() dto: CreateClaimDto,
        @Req() req: AuthRequest,
    ): Promise<Claim> {
        return await this.claimsService.createClaim(dto, req.user.id);
    }
}
