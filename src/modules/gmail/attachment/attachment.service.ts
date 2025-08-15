import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AttachmentService {
    constructor(private readonly prisma: PrismaService) {}

    async readAttachment(attachmentPath: string) {
        return await fs.readFile(attachmentPath);
    }

    async getAttachmentById(attachmentId: string) {
        return this.prisma.attachment.findFirst({
            where: {
                id: attachmentId,
            },
        });
    }

    async saveAttachment(data: {
        filename: string;
        mimeType: string;
        size?: number;
        path: string;
        emailId: string;
    }) {
        return this.prisma.attachment.create({
            data: data,
        });
    }
}
