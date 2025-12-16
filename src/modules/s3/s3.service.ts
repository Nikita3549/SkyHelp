import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    GetObjectCommand,
    PutObjectCommand,
    PutObjectCommandInput,
    S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { UploadFileOptions } from './interfaces/upload-file-options.interface';
import { SIGNED_URL_EXPIRES_IN } from './const';

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

    async getSignedUrl(
        key: string,
        expiresIn = SIGNED_URL_EXPIRES_IN,
    ): Promise<string> {
        const command = new GetObjectCommand({
            Bucket: this.bucket,
            Key: key,
        });

        return getSignedUrl(this.s3, command, { expiresIn });
    }

    async uploadFile(options: UploadFileOptions): Promise<string> {
        const {
            buffer,
            contentType = 'application/octet-stream',
            metadata = {},
            filename,
            claimId,
        } = options;

        const key = `claims/${claimId}/${filename}`;

        const params: PutObjectCommandInput = {
            Bucket: this.bucket,
            Key: key,
            Body: buffer,
            ContentType: contentType,
            Metadata: metadata,
        };

        try {
            const command = new PutObjectCommand(params);
            await this.s3.send(command);

            return key;
        } catch (error) {
            throw new Error(`Failed to upload file to S3: ${error}`);
        }
    }
}
