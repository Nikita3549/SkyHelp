import { DocumentType } from '@prisma/client';

export interface IDocumentData {
    id?: string;
    name: string;
    passengerId: string;
    documentType: DocumentType;
    buffer: Buffer;
    mimetype: string;
}
