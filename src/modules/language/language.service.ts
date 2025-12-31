import { Injectable } from '@nestjs/common';
import { Languages } from './enums/languages.enums';
import { S3Service } from '../s3/s3.service';

@Injectable()
export class LanguageService {
    constructor(private readonly S3Service: S3Service) {}

    async getTranslationsJson(
        language: Languages,
    ): Promise<{ [key: string]: string }> {
        const buffer = await this.S3Service.getPublicFile(
            `/translations/${language}.json`,
        );
        return JSON.parse(buffer.toString());
    }
}
