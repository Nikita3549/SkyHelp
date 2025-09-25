import {
    Injectable,
    NestInterceptor,
    ExecutionContext,
    CallHandler,
    BadRequestException,
    UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { Observable } from 'rxjs';
import { MAX_FILES, ALLOWED_EXTENSIONS, UPLOAD_MAX_BYTES } from './constants';
import { processFile } from './file-process';
import { fileTypeFromBuffer } from 'file-type';

@Injectable()
export class MultiFileProcessingInterceptor implements NestInterceptor {
    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        const req = context
            .switchToHttp()
            .getRequest<Express.Request & { files?: Express.Multer.File[] }>();

        try {
            if (req.files && req.files.length > 0) {
                for (const file of req.files) {
                    if (file.buffer) {
                        const ext = path
                            .extname(file.originalname)
                            .toLowerCase();
                        file.buffer = await processFile(file.buffer, ext);

                        const type = await fileTypeFromBuffer(file.buffer);
                        if (type) {
                            file.mimetype = type.mime;
                        } else {
                            throw new BadRequestException(
                                'Cannot determine file type',
                            );
                        }
                    }
                }
            }
        } catch (err) {
            throw new BadRequestException('File processing failed');
        }

        return next.handle();
    }
}

export function BoardingPassUploadMultiInterceptor() {
    return UseInterceptors(
        FilesInterceptor('boarding-passes', MAX_FILES, {
            storage: memoryStorage(),
            fileFilter: (_req, file, cb) => {
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
                fileSize: UPLOAD_MAX_BYTES,
            },
        }),
        new MultiFileProcessingInterceptor(),
    );
}
