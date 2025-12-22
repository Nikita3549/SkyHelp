export function generateEmailAttachmentKey(
    gmailThreadId: string,
    messageId: string,
    fileName: string,
) {
    return `email-attachment/${gmailThreadId}/${messageId}/${fileName}`;
}
