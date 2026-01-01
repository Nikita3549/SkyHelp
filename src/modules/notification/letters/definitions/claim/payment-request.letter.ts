import { IBaseLetterData } from '../../base-letter-data.interface';
import { BaseLetter } from '../../base-letter';
import { LETTERS_FILENAMES } from '../../../constants/letters-filenames';

interface IPaymentRequestLetterData extends IBaseLetterData {
    customerName: string;
    paymentDetailsLink: string;
    claimId: string;
}

export class PaymentRequestLetter extends BaseLetter<IPaymentRequestLetterData> {
    get subject(): string {
        return `Action Required: Payment Details Needed #${this.data.claimId}`;
    }

    get templateFileName(): string {
        return LETTERS_FILENAMES.CLAIM.REQUEST_PAYMENT_DETAILS;
    }

    get context(): Record<string, string> {
        return {
            customerName: this.data.customerName,
            paymentDetailsLink: this.data.paymentDetailsLink,
        };
    }

    get claimId(): string {
        return this.data.claimId;
    }
}
