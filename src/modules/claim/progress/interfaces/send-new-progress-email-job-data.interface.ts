import { ClaimStatus } from '@prisma/client';
import { Languages } from '../../../language/enums/languages.enums';

export interface ISendNewProgressEmailJobData {
    progressId: string;
    emailData: {
        to: string;
        title: string;
        description: string;
        clientName: string;
        claimId: string;
        language: Languages;
    };
    newClaimStatus: ClaimStatus;
}
