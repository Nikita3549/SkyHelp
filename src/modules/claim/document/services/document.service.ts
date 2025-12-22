import { Injectable } from '@nestjs/common';
import { Document, DocumentType } from '@prisma/client';
import { DocumentDbService } from './database/document-db.service';
import { DocumentAssignmentService } from './assignment/document-assignment.service';
import { DocumentFileService } from './file/document-file.service';
import { S3Service } from '../../../s3/s3.service';
import { IParentalAssignmentData } from './assignment/interfaces/parental-assignment-data.interface';
import { IAssignmentData } from './assignment/interfaces/assignment-data.interface';
import { IAssignmentSignature } from './assignment/interfaces/assignment-signature.interface';
import { SignedUrlDisposition } from '../../../s3/enums/signed-url-disposition.enum';
import { generateClaimDocumentKey } from '../../../../common/utils/generate-claim-document-key';
import { IGetSignedUrlOptions } from '../../../s3/interfaces/get-signed-url-options.interfaces';

@Injectable()
export class DocumentService {
    constructor(
        private readonly documentDbService: DocumentDbService,
        private readonly documentFileService: DocumentFileService,
        private readonly documentAssignmentService: DocumentAssignmentService,
        private readonly S3Service: S3Service,
    ) {}

    // ------------------ ASSIGNMENT ------------------
    async updateAssignmentData(claimId: string, passengerIds: string[]) {
        return this.documentAssignmentService.updateAssignmentData(
            claimId,
            passengerIds,
        );
    }

    async saveParentalSignaturePdf(
        signature: IAssignmentSignature,
        documentData: IParentalAssignmentData,
    ) {
        return this.documentAssignmentService.saveParentalSignaturePdf(
            signature,
            documentData,
        );
    }

    async saveSignaturePdf(
        signature: IAssignmentSignature,
        documentData: IAssignmentData,
    ) {
        return this.documentAssignmentService.saveSignaturePdf(
            signature,
            documentData,
        );
    }

    // ------------------ FILE ------------------
    async mergeFiles(documents: Document[]): Promise<NodeJS.ReadableStream> {
        return this.documentFileService.mergeFiles(documents);
    }

    async getSignedUrl(
        documentKey: string,
        options?: IGetSignedUrlOptions,
    ): Promise<{ signedUrl: string }> {
        return {
            signedUrl: await this.S3Service.getSignedUrl(documentKey, options),
        };
    }

    // ------------------ DATABASE ------------------
    async removeDocument(documentId: string): Promise<Document> {
        return this.documentDbService.remove(documentId);
    }

    async getDocument(documentId: string): Promise<Document | null> {
        return this.documentDbService.get(documentId);
    }

    async updateDocument(
        updateData: Partial<Document>,
        documentId: string,
        isPublicData: boolean = false,
    ): Promise<Document> {
        return this.documentDbService.update(
            updateData,
            documentId,
            isPublicData,
        );
    }

    async getDocumentByIds(ids: string[]) {
        return this.documentDbService.getMany(ids);
    }

    async saveDocuments(
        documents: {
            name: string;
            passengerId: string;
            documentType: DocumentType;
            buffer: Buffer;
            mimetype: string;
        }[],
        claimId: string,
        isPublic: boolean = false,
    ): Promise<Document[]> {
        const documentWithKeys = await Promise.all(
            documents.map(async (doc) => {
                const key = await this.S3Service.uploadFile({
                    s3Key: generateClaimDocumentKey(claimId, doc.name),
                    fileName: doc.name,
                    buffer: doc.buffer,
                    contentType: doc.mimetype,
                });

                return {
                    ...doc,
                    s3Key: key,
                    path: null,
                };
            }),
        );

        const docsToSave = documentWithKeys.map(({ buffer, ...rest }) => rest);

        return this.documentDbService.saveMany(docsToSave, claimId, isPublic);
    }
}
