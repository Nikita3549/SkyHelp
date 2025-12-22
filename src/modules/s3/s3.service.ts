import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    GetObjectCommand,
    GetObjectCommandInput,
    PutObjectCommand,
    PutObjectCommandInput,
    S3Client,
    S3ServiceException,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadFileOptions } from './interfaces/upload-file-options.interface';
import { SIGNED_URL_EXPIRES_IN } from './const';
import * as path from 'path';
import { SignedUrlDisposition } from './enums/signed-url-disposition.enum';
import { IGetSignedUrlOptions } from './interfaces/get-signed-url-options.interfaces';

@Injectable()
export class S3Service {
    private readonly s3: S3Client;
    private readonly bucket: string;

    constructor(private readonly configService: ConfigService) {
        this.s3 = new S3Client({
            region: this.configService.getOrThrow('AWS_REGION'),
            credentials: {
                accessKeyId: this.configService.getOrThrow('AWS_ACCESS_KEY_ID'),
                secretAccessKey: this.configService.getOrThrow(
                    'AWS_SECRET_ACCESS_KEY',
                ),
            },
        });

        this.bucket = this.configService.getOrThrow(
            'AWS_S3_CLAIMS_DOCUMENTS_BUCKET',
        );
    }

    async getBuffer(key: string): Promise<Buffer> {
        try {
            const command = new GetObjectCommand({
                Bucket: this.bucket,
                Key: key,
            });

            const res = await this.s3.send(command);

            if (!res?.Body) {
                throw new Error();
            }

            const byteArray = await res.Body.transformToByteArray();

            return Buffer.from(byteArray);
        } catch (e: unknown) {
            if (e instanceof S3ServiceException) {
                throw new Error(`Failed to get buffer from S3: ${e.message}`);
            }

            throw new Error(
                `Unknown error while getting buffer: ${JSON.stringify(e, null, 2)}`,
            );
        }
    }

    async getSignedUrl(
        key: string,
        options?: IGetSignedUrlOptions,
    ): Promise<string> {
        try {
            const params: GetObjectCommandInput = {
                Bucket: this.bucket,
                Key: key,
            };

            if (options?.disposition == SignedUrlDisposition.inline) {
                params.ResponseContentDisposition = 'inline';
            }

            const command = new GetObjectCommand(params);

            return getSignedUrl(this.s3, command, {
                expiresIn: SIGNED_URL_EXPIRES_IN,
            });
        } catch (e: unknown) {
            if (e instanceof S3ServiceException) {
                throw new Error(
                    `Failed to get signed url from S3: ${e.message}`,
                );
            }
            throw new Error(
                `Unknown error while getting signed url: ${JSON.stringify(e, null, 2)}`,
            );
        }
    }

    async uploadFile(options: UploadFileOptions): Promise<string> {
        let {
            buffer,
            contentType = 'application/octet-stream',
            metadata = {},
            s3Key,
            fileName,
        } = options;

        const params: PutObjectCommandInput = {
            Key: s3Key,
            Bucket: this.bucket,
            Body: buffer,
            ContentType: contentType,
            Metadata: metadata,
            ContentLength: buffer.length,
            ContentDisposition: `attachment; filename="${fileName}"`,
        };

        try {
            const command = new PutObjectCommand(params);
            await this.s3.send(command);

            return s3Key;
        } catch (error) {
            throw new Error(`Failed to upload file to S3: ${error}`);
        }
    }
}
