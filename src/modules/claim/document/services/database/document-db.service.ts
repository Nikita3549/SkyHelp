import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { Document, DocumentType } from '@prisma/client';

@Injectable()
export class DocumentDbService {
    constructor(private readonly prisma: PrismaService) {}

    async remove(documentId: string): Promise<Document> {
        return this.prisma.document.update({
            data: {
                deletedAt: new Date(),
            },
            where: { id: documentId },
        });
    }

    async get(documentId: string): Promise<Document | null> {
        return this.prisma.document.findFirst({
            where: {
                id: documentId,
                deletedAt: null,
            },
        });
    }

    async getByPassengerId(passengerId: string): Promise<Document[]> {
        return this.prisma.document.findMany({
            where: {
                passengerId,
                deletedAt: null,
            },
        });
    }

    async getMany(ids: string[]): Promise<Document[]> {
        return this.prisma.document.findMany({
            where: {
                id: { in: ids },
                deletedAt: null,
            },
        });
    }

    async saveMany(
        documents: {
            id?: string;
            name: string;
            path: string | null;
            passengerId: string;
            documentType: DocumentType;
            s3Key: string;
            mimetype: string;
        }[],
        claimId: string,
        isPublic: boolean = false,
    ): Promise<Document[]> {
        return Promise.all(
            documents.map((doc) =>
                this.prisma.document.create({
                    data: {
                        id: doc.id,
                        name: doc.name,
                        path: doc.path,
                        claimId,
                        passengerId: doc.passengerId,
                        type: doc.documentType,
                        s3Key: doc.s3Key,
                        mimetype: doc.mimetype,
                    },
                    select: isPublic ? this.getPublicDataSelect() : undefined,
                }),
            ),
        );
    }

    async update(
        updateData: Partial<Document>,
        documentId: string,
        isPublicData: boolean = false,
    ): Promise<Document> {
        return this.prisma.document.update({
            data: updateData,
            where: {
                id: documentId,
            },
            select: isPublicData ? this.getPublicDataSelect() : undefined,
        });
    }

    getPublicDataSelect() {
        return {
            id: true,
            name: true,
            type: true,
            claimId: true,
            passengerId: true,
        };
    }
}
