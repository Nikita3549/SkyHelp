export function generateEmailAttachmentKey(
    messageId: string,
    fileName: string,
) {
    return `email-attachment/${messageId}/${fileName}`;
}
