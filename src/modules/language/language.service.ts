import { Injectable, NotFoundException } from '@nestjs/common';
import { INVALID_LANGUAGE } from './constants';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Languages } from './enums/languages.enums';

@Injectable()
export class LanguageService {
    async getTranslationsJson(
        language: Languages,
    ): Promise<{ [key: string]: string }> {
        const filename = `${language}.json`;

        return JSON.parse(
            await fs.readFile(
                path.join(__dirname, `../../../translations/${filename}`),
                { encoding: 'utf-8' },
            ),
        );
    }
}
