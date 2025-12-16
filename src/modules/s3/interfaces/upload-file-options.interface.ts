export interface UploadFileOptions {
    buffer: Buffer;
    contentType?: string;
    metadata?: Record<string, string>;
    filename: string;
    claimId: string;
}
