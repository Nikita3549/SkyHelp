export interface UploadFileOptions {
    buffer: Buffer;
    contentType: string;
    metadata?: Record<string, string>;
    s3Key: string;
    fileName: string;
}
