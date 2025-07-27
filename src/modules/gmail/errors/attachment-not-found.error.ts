export class AttachmentNotFoundError extends Error {
    constructor(message?: string) {
        super(message);
        this.name = 'AttachmentNotFoundError';
    }
}
