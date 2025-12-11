import { Injectable } from '@nestjs/common';
import { Document, DocumentType } from '@prisma/client';
import { DocumentDbService } from './database/document-db.service';
import { DocumentAssignmentService } from './assignment/document-assignment.service';
import { DocumentFileService } from './file/document-file.service';

@Injectable()
export class DocumentService {
    constructor(
        private readonly documentDbService: DocumentDbService,
        private readonly documentFileService: DocumentFileService,
        private readonly documentAssignmentService: DocumentAssignmentService,
    ) {}

    // ------------------ ASSIGNMENT ------------------
    async updateAssignmentData(claimId: string, passengerIds: string[]) {
        return this.documentAssignmentService.updateAssignmentData(
            claimId,
            passengerIds,
        );
    }

    async updateParentalAssignment(
        sourcePath: string,
        assignmentData: {
            claimId: string;
            address: string;
            airlineName: string;
            date: Date;
            firstName: string;
            lastName: string;
            flightNumber: string;
            minorBirthday: Date;
            parentFirstName: string;
            parentLastName: string;
        },
    ): Promise<string> {
        return this.documentAssignmentService.updateParentalAssignment(
            sourcePath,
            assignmentData,
        );
    }

    async updateAssignment(
        sourcePath: string,
        assignmentData: {
            claimId: string;
            address: string;
            airlineName: string;
            date: Date;
            firstName: string;
            lastName: string;
            flightNumber: string;
        },
        isOldAssignment: boolean,
    ): Promise<string> {
        return this.documentAssignmentService.updateAssignment(
            sourcePath,
            assignmentData,
            isOldAssignment,
        );
    }

    async saveParentalSignaturePdf(
        signatureDataUrl: string | null,
        documentData: {
            claimId: string;
            firstName: string;
            lastName: string;
            address: string;
            date: Date;
            flightNumber: string;
            airlineName: string;
            parentFirstName: string;
            parentLastName: string;
            minorBirthday: Date;
        },
        signatureTemplatePath?: string,
        isOldAssignment: boolean = false,
    ) {
        return this.documentAssignmentService.saveParentalSignaturePdf(
            signatureDataUrl,
            documentData,
            signatureTemplatePath,
            isOldAssignment,
        );
    }

    async saveSignaturePdf(
        signatureDataUrl: string | null,
        documentData: {
            claimId: string;
            firstName: string;
            lastName: string;
            address: string;
            date: Date;
            flightNumber: string;
            airlineName: string;
        },
        signatureTemplatePath?: string,
    ) {
        return this.documentAssignmentService.saveSignaturePdf(
            signatureDataUrl,
            documentData,
            signatureTemplatePath,
        );
    }

    // ------------------ FILE ------------------
    async mergeFiles(
        files: Express.Multer.File[],
    ): Promise<NodeJS.ReadableStream> {
        return this.documentFileService.mergeFiles(files);
    }

    async getExpressMulterFilesFromPaths(
        filePaths: string[],
    ): Promise<Express.Multer.File[]> {
        return this.documentFileService.getExpressMulterFilesFromPaths(
            filePaths,
        );
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

    async getDocumentsByPassengerId(passengerId: string): Promise<Document[]> {
        return this.documentDbService.getByPassengerId(passengerId);
    }

    async getDocumentByIds(ids: string[]) {
        return this.documentDbService.getMany(ids);
    }

    async saveDocuments(
        documents: {
            name: string;
            path: string;
            passengerId: string;
            documentType: DocumentType;
        }[],
        claimId: string,
        isPublic: boolean = false,
    ): Promise<Document[]> {
        return this.documentDbService.saveMany(documents, claimId, isPublic);
    }
}
