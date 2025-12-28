import { Module } from '@nestjs/common';
import { LanguageService } from './language.service';
import { S3Module } from '../s3/s3.module';

@Module({
    imports: [S3Module],
    providers: [LanguageService],
    exports: [LanguageService],
})
export class LanguageModule {}
