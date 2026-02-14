import { ClaimDiscrepancy } from '@prisma/client';

export interface RefreshDiscrepancyResponse {
    discrepancy: ClaimDiscrepancy;
    updatedPassportSignatureSignedUrl?: string;
}
