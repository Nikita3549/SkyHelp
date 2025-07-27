import { IAttachment } from '../../gmail/interfaces/attachment.interface';

export interface ILetter {
    id: string;
    threadId: string;
    from: string;
    to: string[];
    subject: string;
    date: Date;
    snippet: string;
    attachments: IAttachment[];
}
