import { DocumentType } from '@prisma/client';

export interface IDocumentData {
    name: string;
    passengerId: string;
    documentType: DocumentType;
    buffer: Buffer;
    mimetype: string;
}
