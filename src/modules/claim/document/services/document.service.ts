import { Injectable } from '@nestjs/common';
import { Document } from '@prisma/client';
import { DocumentDbService } from './database/document-db.service';
import { DocumentAssignmentService } from './assignment/document-assignment.service';
import { DocumentFileService } from './file/document-file.service';
import { S3Service } from '../../../s3/s3.service';
import { IAssignmentSignature } from './assignment/interfaces/assignment-signature.interface';
import { generateClaimDocumentKey } from '../../../../common/utils/generate-claim-document-key';
import { IGetSignedUrlOptions } from '../../../s3/interfaces/get-signed-url-options.interfaces';
import { IDocumentData } from './database/interfaces/document-data.interface';
import { ISaveSignatureOptions } from './assignment/interfaces/save-signature-options.interface';
import { ISaveSignatureData } from '../interfaces/save-signature-data.interface';
import { InjectQueue } from '@nestjs/bullmq';
import { GENERATE_ASSIGNMENT_QUEUE_KEY } from '../processors/constants/generate-assignment-queue-key';
import { Queue } from 'bullmq';
import { IGenerateAssignmentJobData } from '../processors/interfaces/generateAssignmentJobData';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';
import { ClaimService } from '../../claim.service';

@Injectable()
export class DocumentService {
    constructor(
        private readonly documentDbService: DocumentDbService,
        private readonly documentFileService: DocumentFileService,
        private readonly documentAssignmentService: DocumentAssignmentService,
        private readonly S3Service: S3Service,
        private readonly claimService: ClaimService,
        @InjectQueue(GENERATE_ASSIGNMENT_QUEUE_KEY)
        private readonly generateAssignmentQueue: Queue,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    // ------------------ ASSIGNMENT ------------------
    async updateAssignmentData(claimId: string, passengerIds: string[]) {
        // This method always requires refreshed claim data
        const claim = await this.claimPersistenceService.findOneById(claimId);

        if (!claim) {
            return;
        }

        return this.documentAssignmentService.updateAssignmentData(
            claim,
            passengerIds,
        );
    }

    async saveSignature(
        signature: IAssignmentSignature,
        saveSignatureData: ISaveSignatureData,
        options?: ISaveSignatureOptions,
    ) {
        const { claim, passenger } = saveSignatureData;

        if (options?.isParental) {
            if (passenger.isCustomer) {
                throw new Error(
                    `Trying to save parental signature for customer passengerId: ${passenger.id}`,
                );
            }
            if (
                !passenger.birthday ||
                !passenger.parentFirstName ||
                !passenger.parentLastName
            ) {
                throw new Error(
                    `Trying to save parental signature for passenger without birthday or parentFirstName or parentLastName: ${passenger.id}`,
                );
            }
        }

        const jobData: IGenerateAssignmentJobData = {
            claim,
            passenger,
            signature,
            options,
        };

        await this.generateAssignmentQueue.add('generateAssignment', jobData);
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
        documents: IDocumentData[],
        claimId: string,
        options?: {
            handleIsAllDocumentsUploaded?: boolean;
            isPublic?: boolean;
        },
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

        const savedDocuments = await this.documentDbService.saveMany(
            docsToSave,
            claimId,
            !!options?.isPublic,
        );

        if (options?.handleIsAllDocumentsUploaded) {
            await this.claimService.handleAllDocumentsUploaded(claimId);
        }

        return savedDocuments;
    }
}
