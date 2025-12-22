import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PassThrough, Readable } from 'stream';
import { pngToJpeg } from './utils/png-to-jpeg.converter';
import { convertDocToPdf } from './utils/doc-to-pdf.converter';
import { S3Service } from '../../../../s3/s3.service';
import { Document } from '@prisma/client';
import { logDocumentWithoutS3Key } from '../../utils/logDocumentWithoutS3Key';

@Injectable()
export class DocumentFileService {
    constructor(private readonly S3Service: S3Service) {}

    async mergeFiles(documents: Document[]): Promise<NodeJS.ReadableStream> {
        const mergedPdf = await PDFDocument.create();

        for (const document of documents) {
            if (!document?.s3Key) {
                logDocumentWithoutS3Key(document.id);
                continue;
            }
            const buffer = await this.S3Service.getBuffer(document.s3Key);
            const ext = path.extname(document.name).toLowerCase();

            if (ext === '.pdf') {
                const pdf = await PDFDocument.load(buffer);
                const copiedPages = await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices(),
                );
                copiedPages.forEach((p) => mergedPdf.addPage(p));
            } else if (ext === '.jpg' || ext === '.jpeg') {
                const img = await mergedPdf.embedJpg(buffer);
                const page = mergedPdf.addPage([img.width, img.height]);
                page.drawImage(img, {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height,
                });
            } else if (ext === '.png') {
                try {
                    const img = await mergedPdf.embedPng(buffer);
                    const page = mergedPdf.addPage([img.width, img.height]);
                    page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: img.width,
                        height: img.height,
                    });
                } catch (error) {
                    try {
                        const jpegBuffer = await pngToJpeg(buffer);
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
                const tempInput = path.join('/tmp', document.name);
                const tempOutput = tempInput.replace(ext, '.pdf');
                await fs.writeFile(tempInput, buffer);
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
}
