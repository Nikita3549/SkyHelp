import { IBaseLetterData } from '../../base-letter-data.interface';
import { DocumentRequestReason } from '@prisma/client';
import { BaseLetter } from '../../base-letter';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface ISpecializedDocumentRequestLetterData extends IBaseLetterData {
    customerName: string;
    claimId: string;
    documentRequestReason: DocumentRequestReason;
    continueLink: string;
}

export class SpecializedDocumentRequestLetter extends BaseLetter<ISpecializedDocumentRequestLetterData> {
    get subject(): string {
        let subject: string = `Signature mismatch in submitted documents #${this.data.claimId}`;
        if (
            this.data.documentRequestReason ==
            DocumentRequestReason.PASSPORT_IMAGE_UNCLEAR
        ) {
            subject = `Passport image unclear - resubmission required #${this.data.claimId}`;
        }
        if (
            this.data.documentRequestReason ==
            DocumentRequestReason.PASSPORT_MISMATCH
        ) {
            subject = `Passport data mismatch #${this.data.claimId}`;
        }
        return subject;
    }

    get templateFileName(): string {
        let templateFilename: string =
            LETTERS_FILENAMES.CLAIM.SPECIALIZED_DOC_REQUESTS.SIGNATURE_MISMATCH;
        if (
            this.data.documentRequestReason ==
            DocumentRequestReason.PASSPORT_IMAGE_UNCLEAR
        ) {
            templateFilename =
                LETTERS_FILENAMES.CLAIM.SPECIALIZED_DOC_REQUESTS
                    .PASSPORT_IMAGE_UNCLEAR;
        }
        if (
            this.data.documentRequestReason ==
            DocumentRequestReason.PASSPORT_MISMATCH
        ) {
            templateFilename =
                LETTERS_FILENAMES.CLAIM.SPECIALIZED_DOC_REQUESTS
                    .PASSPORT_MISMATCH;
        }
        return templateFilename;
    }

    get context(): Record<string, string> {
        return {
            customerName: this.data.customerName,
            link: this.data.continueLink,
        };
    }

    get claimId(): string {
        return this.data.claimId;
    }
}
