import { ClaimStatus } from '@prisma/client';
import { Languages } from '../../../language/enums/languages.enums';

export interface ISendNewProgressEmailJobData {
    progressId: string;
    referralCode?: string | null;
    passengerId?: string; // temporary for migration from id to ids
    passengerIds?: string[];
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
