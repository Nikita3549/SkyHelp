import { Get, Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'node:path';
import { PrelitDirectoryPath } from '../../common/constants/paths/PrelitDirectoryPath';

@Injectable()
export class PrelitStaticDocumentsService {
    @Get()
    async getDefaultPrelitDocument(): Promise<Buffer> {
        const defaultPrelitDocumentPath = path.join(
            PrelitDirectoryPath,
            'prelit-default-document.pdf',
        );

        return await fs.readFile(defaultPrelitDocumentPath);
    }
}
