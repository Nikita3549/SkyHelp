import { Injectable } from '@nestjs/common';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { DocumentRequest, DocumentRequestStatus } from '@prisma/client';

@Injectable()
export class DocumentRequestService {
    constructor(private readonly prisma: PrismaService) {}

    async create(data: CreateDocumentRequestDto): Promise<DocumentRequest> {
        return this.prisma.documentRequest.create({
            data,
        });
    }

    async getByClaimId(claimId: string): Promise<DocumentRequest[]> {
        return this.prisma.documentRequest.findMany({
            where: {
                claimId,
            },
        });
    }

    async updateStatus(
        documentRequestId: string,
        status: DocumentRequestStatus,
    ) {
        return this.prisma.documentRequest.update({
            data: {
                status,
            },
            where: {
                id: documentRequestId,
            },
        });
    }
}
