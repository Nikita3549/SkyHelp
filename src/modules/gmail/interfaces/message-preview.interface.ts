export interface MessagePreview {
    id: string;
    threadId: string;
    from: string;
    to: string[];
    subject: string;
    date: number;
    snippet: string;
    hasAttachments: boolean;
}
