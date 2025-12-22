import * as path from 'path';

export function generateClaimDocumentKey(claimId: string, fileName: string) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(fileName);

    return `claims/${claimId}/${uniqueSuffix}${ext}`;
}
