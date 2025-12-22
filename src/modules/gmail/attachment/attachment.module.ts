import { Module } from '@nestjs/common';
import { AttachmentService } from './attachment.service';
import { S3Module } from '../../s3/s3.module';

@Module({
    providers: [AttachmentService],
    exports: [AttachmentService],
    imports: [S3Module],
})
export class AttachmentModule {}
