import { Module } from '@nestjs/common';
import { EmailAttachmentService } from './email-attachment.service';
import { S3Module } from '../s3/s3.module';

@Module({
    providers: [EmailAttachmentService],
    exports: [EmailAttachmentService],
    imports: [S3Module],
})
export class EmailAttachmentModule {}
