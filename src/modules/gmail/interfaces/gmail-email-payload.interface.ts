export interface GmailEmailPayload {
    id: string;
    threadId: string;
    messageId?: string | null;
    inReplyTo?: string | null;
    references?: string[];
    subject?: string | null;
    normalizedSubject?: string | null;
    fromName?: string | null;
    fromEmail?: string | null;
    toName?: string | null;
    toEmail?: string | null;
    snippet?: string | null;
    bodyPlain?: string | null;
    bodyHtml?: string | null;
    sizeEstimate?: number | null;
    internalDate?: number | Date | null;
    headersJson?: any | null;
    claimId?: string | null;
    isInbox?: boolean;
}
