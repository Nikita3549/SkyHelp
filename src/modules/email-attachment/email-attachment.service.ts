import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { S3Service } from '../s3/s3.service';
import { IGetSignedUrlOptions } from '../s3/interfaces/get-signed-url-options.interfaces';

@Injectable()
export class EmailAttachmentService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly S3Service: S3Service,
    ) {}

    async readAttachment(
        attachmentS3Key: string,
        options?: IGetSignedUrlOptions,
    ): Promise<{ signedUrl: string }> {
        const signedUrl = await this.S3Service.getSignedUrl(
            attachmentS3Key,
            options,
        );

        return {
            signedUrl,
        };
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
        path?: string;
        s3Key: string;
        emailId: string;
    }) {
        return this.prisma.attachment.create({
            data: data,
        });
    }
}
