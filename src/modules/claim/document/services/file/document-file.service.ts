import { Injectable } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import * as fs from 'fs/promises';
import * as path from 'path';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { pngToJpeg } from './utils/png-to-jpeg.converter';
import { convertDocToPdf } from './utils/doc-to-pdf.converter';
import { PrelitDirectoryPath } from '../../../../../common/constants/paths/PrelitDirectoryPath';
import { MAX_WIDTH } from './constants/page-sizes';
import { MergeDocumentsExtensions } from '../../constants/merge-documents-extensions.enum';
import * as sharp from 'sharp';

const execFileAsync = promisify(execFile);

@Injectable()
export class DocumentFileService {
    async mergeFiles(
        documents: { buffer: Buffer; name: string }[],
        options?: {
            addDefaultPrelitDocument?: boolean;
            mergedFileExtension: MergeDocumentsExtensions;
        },
    ): Promise<Buffer> {
        if (options?.mergedFileExtension === MergeDocumentsExtensions.png) {
            return await this.mergeAsImages(documents);
        }

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
            }

            if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                let img;
                try {
                    img =
                        ext === '.png'
                            ? await mergedPdf.embedPng(document.buffer)
                            : await mergedPdf.embedJpg(document.buffer);
                } catch {
                    const jpegBuffer = await pngToJpeg(document.buffer);
                    img = await mergedPdf.embedJpg(jpegBuffer);
                }

                const scale = img.width > MAX_WIDTH ? MAX_WIDTH / img.width : 1;
                const finalWidth = MAX_WIDTH;
                const finalHeight = img.height * scale;

                const page = mergedPdf.addPage([finalWidth, finalHeight]);
                page.drawImage(img, {
                    x: 0,
                    y: 0,
                    width: finalWidth,
                    height: finalHeight,
                });
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

        const pdfBytes = await mergedPdf.save();
        return Buffer.from(pdfBytes);
    }

    private async mergeAsImages(
        documents: { buffer: Buffer; name: string }[],
    ): Promise<Buffer> {
        const images: Buffer[] = [];

        for (const document of documents) {
            const ext = path.extname(document.name).toLowerCase();
            if (ext === '.pdf') {
                const pages = await this.pdfToPngWithPoppler(document.buffer);
                images.push(...pages);
                continue;
            }
            if (['.jpg', '.jpeg', '.png'].includes(ext)) {
                images.push(document.buffer);
            }
        }

        const metadatas = await Promise.all(
            images.map((img) => sharp(img).metadata()),
        );

        const maxWidth = Math.max(...metadatas.map((m) => m.width || 0));
        const totalHeight = metadatas.reduce(
            (sum, m) => sum + (m.height || 0),
            0,
        );

        let currentTop = 0;

        const compositeList = images.map((img, i) => {
            const imgWidth = metadatas[i].width || 0;
            const imgHeight = metadatas[i].height || 0;

            const left = Math.round((maxWidth - imgWidth) / 2);
            const top = currentTop;

            currentTop += imgHeight;

            return {
                input: img,
                top: top,
                left: left,
            };
        });

        const buffer = await sharp({
            create: {
                width: maxWidth,
                height: totalHeight,
                channels: 4,
                background: { r: 255, g: 255, b: 255, alpha: 1 },
            },
        })
            .composite(compositeList)
            .png({
                compressionLevel: 9,
                palette: true,
                quality: 50,
            })
            .toBuffer();

        return buffer;
    }

    private async pdfToPngWithPoppler(pdfBuffer: Buffer): Promise<Buffer[]> {
        const id = Date.now() + '-' + Math.random().toString(36).slice(2);
        const inputPath = `/tmp/${id}.pdf`;
        const outputPrefix = `/tmp/${id}`;

        await fs.writeFile(inputPath, pdfBuffer);

        await execFileAsync('pdftocairo', [
            '-png',
            '-r',
            '150',
            inputPath,
            outputPrefix,
        ]);

        const files = await fs.readdir('/tmp');
        const pageFiles = files
            .filter(
                (f) =>
                    f.startsWith(path.basename(outputPrefix)) &&
                    f.endsWith('.png'),
            )
            .sort();

        const buffers = await Promise.all(
            pageFiles.map((f) => fs.readFile(path.join('/tmp', f))),
        );

        await fs.unlink(inputPath).catch(() => null);
        await Promise.all(
            pageFiles.map((f) =>
                fs.unlink(path.join('/tmp', f)).catch(() => null),
            ),
        );

        return buffers;
    }
}
