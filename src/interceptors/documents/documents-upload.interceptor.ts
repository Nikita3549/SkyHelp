import { UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';

export function DocumentsUploadInterceptor() {
    return UseInterceptors(
        FilesInterceptor('documents', 10, {
            storage: diskStorage({
                destination: path.join(__dirname, '../../../uploads'),
                filename: (_req, file, cb) => {
                    const uniqueSuffix =
                        Date.now() + '-' + Math.round(Math.random() * 1e9);
                    const ext = path.extname(file.originalname);
                    cb(null, `${uniqueSuffix}${ext}`);
                },
            }),
            limits: {
                files: 10,
                fileSize: 10 * 1024 * 1024,
            },
        }),
    );
}
