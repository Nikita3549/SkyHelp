import { IBaseLetterData } from '../../base-letter-data.interface';
import { DocumentType } from '@prisma/client';
import { BaseLetter } from '../../base-letter';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IDocumentRequestLetterData extends IBaseLetterData {
    customerName: string;
    claimId: string;
    dashboardLink: string;
    documentRequestsData: {
        documentType: DocumentType;
        client: string;
    }[];
}

export class DocumentRequestLetter extends BaseLetter<IDocumentRequestLetterData> {
    get subject(): string {
        return `Action required: upload missing documents for claim #${this.data.claimId}`;
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.CLAIM.DOCUMENT_REQUEST;
    }

    get context(): Record<string, any> {
        return {
            customerName: this.data.customerName,
            claimId: this.data.claimId,
            dashboardLink: this.data.dashboardLink,
            documentRequestsData: this.data.documentRequestsData,
        };
    }

    get claimId(): string {
        return this.data.claimId;
    }
}
