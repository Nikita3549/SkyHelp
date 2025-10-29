import { BadRequestException, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES } from './constants';
import { UPLOAD_DIRECTORY_PATH } from '../../common/constants/paths/UploadsDirectoryPath';
import { DocumentType } from '@prisma/client';

export function ValidatedDocumentsUploadInterceptor() {
    return UseInterceptors(
        FilesInterceptor('documents', MAX_FILES, {
            storage: diskStorage({
                destination: UPLOAD_DIRECTORY_PATH,
                filename: (_req, file, cb) => {
                    const uniqueSuffix =
                        Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    cb(null, `${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (req, file, cb) => {
                const ext = path.extname(file.originalname).toLowerCase();
                if (!ALLOWED_EXTENSIONS.includes(ext)) {
                    return cb(
                        new BadRequestException(
                            `Unsupported file type: ${ext}`,
                        ),
                        false,
                    );
                }

                const raw = req.body.documentTypes;
                let parsed: unknown;

                try {
                    parsed = Array.isArray(raw) ? raw : JSON.parse(raw ?? '[]');
                } catch {
                    return cb(
                        new BadRequestException(
                            'Invalid JSON in documentTypes field',
                        ),
                        false,
                    );
                }

                if (!Array.isArray(parsed) || parsed.length === 0) {
                    return cb(
                        new BadRequestException(
                            'documentTypes must be a non-empty array',
                        ),
                        false,
                    );
                }

                const allowedValues = Object.values(DocumentType);
                const invalid = parsed.filter(
                    (item) => !allowedValues.includes(item),
                );

                if (invalid.length > 0) {
                    return cb(
                        new BadRequestException(
                            `Invalid documentTypes: ${invalid.join(', ')}`,
                        ),
                        false,
                    );
                }

                req.body.documentTypes = parsed;

                cb(null, true);
            },
            limits: {
                files: MAX_FILES,
                fileSize: MAX_FILE_SIZE,
            },
        }),
    );
}
