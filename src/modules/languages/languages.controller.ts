import {
    Controller,
    Get,
    NotFoundException,
    Param,
    Query,
} from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { INVALID_LANGUAGE } from './constants';

@Controller('languages')
export class LanguagesController {
    @Get(':language')
    async getLanguage(@Param('language') language: string) {
        const filename = `${language}.json`;

        return JSON.parse(
            await fs
                .readFile(
                    path.join(__dirname, `../../../translations/${filename}`),
                    { encoding: 'utf-8' },
                )
                .catch((_e: unknown) => {
                    console.error(_e);
                    throw new NotFoundException(INVALID_LANGUAGE);
                }),
        );
    }
}
