import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PassThrough, Readable } from 'stream';
import { pngToJpeg } from './utils/png-to-jpeg.converter';
import { convertDocToPdf } from './utils/doc-to-pdf.converter';

@Injectable()
export class DocumentFileService {
    async mergeFiles(
        files: Express.Multer.File[],
    ): Promise<NodeJS.ReadableStream> {
        const mergedPdf = await PDFDocument.create();

        for (const file of files) {
            const ext = path.extname(file.originalname).toLowerCase();

            if (ext === '.pdf') {
                const pdf = await PDFDocument.load(file.buffer);
                const copiedPages = await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices(),
                );
                copiedPages.forEach((p) => mergedPdf.addPage(p));
            } else if (ext === '.jpg' || ext === '.jpeg') {
                const img = await mergedPdf.embedJpg(file.buffer);
                const page = mergedPdf.addPage([img.width, img.height]);
                page.drawImage(img, {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height,
                });
            } else if (ext === '.png') {
                try {
                    const img = await mergedPdf.embedPng(file.buffer);
                    const page = mergedPdf.addPage([img.width, img.height]);
                    page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: img.width,
                        height: img.height,
                    });
                } catch (error) {
                    try {
                        const jpegBuffer = await pngToJpeg(file.buffer);
                        const img = await mergedPdf.embedJpg(jpegBuffer);
                        const page = mergedPdf.addPage([img.width, img.height]);
                        page.drawImage(img, {
                            x: 0,
                            y: 0,
                            width: img.width,
                            height: img.height,
                        });
                    } catch (jpegError) {
                        throw new InternalServerErrorException(
                            'Cannot merge png into pdf',
                        );
                    }
                }
            } else if (ext === '.doc' || ext === '.docx') {
                const tempInput = path.join('/tmp', file.originalname);
                const tempOutput = tempInput.replace(ext, '.pdf');
                await fs.writeFile(tempInput, file.buffer);
                await convertDocToPdf(tempInput, tempOutput);

                const pdfBuffer = await fs.readFile(tempOutput);
                const pdf = await PDFDocument.load(pdfBuffer);
                const copiedPages = await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices(),
                );
                copiedPages.forEach((p) => mergedPdf.addPage(p));

                await fs.unlink(tempInput).catch(() => null);
                await fs.unlink(tempOutput).catch(() => null);
            }
        }

        const mergedBytes = await mergedPdf.save();
        const stream = new PassThrough();
        stream.end(Buffer.from(mergedBytes));
        return stream;
    }

    async getExpressMulterFilesFromPaths(
        filePaths: string[],
    ): Promise<Express.Multer.File[]> {
        const files: Express.Multer.File[] = [];

        for (const filePath of filePaths) {
            const buffer = await fs.readFile(filePath);
            const ext = path.extname(filePath).toLowerCase();

            let mimetype = 'application/octet-stream';
            if (ext === '.pdf') mimetype = 'application/pdf';
            else if (ext === '.jpg' || ext === '.jpeg') mimetype = 'image/jpeg';
            else if (ext === '.png') mimetype = 'image/png';
            else if (ext === '.doc') mimetype = 'application/msword';
            else if (ext === '.docx')
                mimetype =
                    'application/vnd.openxmlformats-officedocument.wordprocessingml.document';

            files.push({
                fieldname: 'files',
                originalname: path.basename(filePath),
                encoding: '7bit',
                mimetype,
                buffer,
                size: buffer.length,
                path: filePath,
                stream: Readable.from(buffer),
                destination: filePath,
                filename: path.basename(filePath),
            });
        }

        return files;
    }
}
