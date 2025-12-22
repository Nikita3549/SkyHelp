import { BadRequestException, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import * as lookup from 'mime-types';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES } from './constants';

export function DocumentsUploadInterceptor(fieldName: string = 'documents') {
    return UseInterceptors(
        FilesInterceptor(fieldName, MAX_FILES, {
            storage: memoryStorage(),
            fileFilter: (_req, file, cb) => {
                file.originalname = Buffer.from(
                    file.originalname,
                    'latin1',
                ).toString('utf8');

                const ext = path.extname(file.originalname).toLowerCase();

                file.mimetype =
                    lookup.lookup(ext) || 'application/octet-stream';

                if (ALLOWED_EXTENSIONS.includes(ext)) {
                    cb(null, true);
                } else {
                    cb(
                        new BadRequestException(
                            `Unsupported file type: ${ext}`,
                        ),
                        false,
                    );
                }
            },
            limits: {
                files: MAX_FILES,
                fileSize: MAX_FILE_SIZE,
            },
        }),
    );
}
