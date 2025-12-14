import { BadRequestException, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import { ALLOWED_EXTENSIONS, MAX_FILE_SIZE, MAX_FILES } from './constants';
import { UPLOAD_DIRECTORY_PATH } from '../../constants/paths/UploadsDirectoryPath';

export function DocumentsUploadInterceptor() {
    return UseInterceptors(
        FilesInterceptor('documents', MAX_FILES, {
            storage: diskStorage({
                destination: UPLOAD_DIRECTORY_PATH,
                filename: (_req, file, cb) => {
                    file.originalname = Buffer.from(
                        file.originalname,
                        'latin1',
                    ).toString('utf8');
                    const uniqueSuffix =
                        Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    cb(null, `${uniqueSuffix}${ext}`);
                },
            }),
            fileFilter: (_req, file, cb) => {
                file.originalname = Buffer.from(
                    file.originalname,
                    'latin1',
                ).toString('utf8');
                const ext = path.extname(file.originalname).toLowerCase();
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
