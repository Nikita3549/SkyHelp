import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PassThrough } from 'stream';
import { pngToJpeg } from './utils/png-to-jpeg.converter';
import { convertDocToPdf } from './utils/doc-to-pdf.converter';
import { PrelitDirectoryPath } from '../../../../../common/constants/paths/PrelitDirectoryPath';

@Injectable()
export class DocumentFileService {
    async mergeFiles(
        documents: { buffer: Buffer; name: string }[],
        options?: { addDefaultPrelitDocument: boolean },
    ): Promise<NodeJS.ReadableStream> {
        const mergedPdf = await PDFDocument.create();

        for (const document of documents) {
            const ext = path.extname(document.name).toLowerCase();

            if (ext === '.pdf') {
                const pdf = await PDFDocument.load(document.buffer);
                const copiedPages = await mergedPdf.copyPages(
                    pdf,
                    pdf.getPageIndices(),
                );
                copiedPages.forEach((p) => mergedPdf.addPage(p));
            } else if (ext === '.jpg' || ext === '.jpeg') {
                const img = await mergedPdf.embedJpg(document.buffer);
                const page = mergedPdf.addPage([img.width, img.height]);
                page.drawImage(img, {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height,
                });
            } else if (ext === '.png') {
                try {
                    const img = await mergedPdf.embedPng(document.buffer);
                    const page = mergedPdf.addPage([img.width, img.height]);
                    page.drawImage(img, {
                        x: 0,
                        y: 0,
                        width: img.width,
                        height: img.height,
                    });
                } catch (error) {
                    try {
                        const jpegBuffer = await pngToJpeg(document.buffer);
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
                await fs.writeFile(tempInput, document.buffer);
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

        if (options?.addDefaultPrelitDocument) {
            const buffer = await fs.readFile(
                path.join(PrelitDirectoryPath, 'prelit-default-document.pdf'),
            );
            const pdf = await PDFDocument.load(buffer);
            const copiedPages = await mergedPdf.copyPages(
                pdf,
                pdf.getPageIndices(),
            );
            copiedPages.forEach((p) => mergedPdf.addPage(p));
        }

        const mergedBytes = await mergedPdf.save();
        const stream = new PassThrough();
        stream.end(Buffer.from(mergedBytes));
        return stream;
    }
}
