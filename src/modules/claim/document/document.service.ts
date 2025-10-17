import { Injectable } from '@nestjs/common';
import { Document, DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { UPLOAD_DIRECTORY_PATH } from '../../../constants/UploadsDirectoryPath';
import { spawn } from 'child_process';
import { PassThrough, Readable } from 'stream';
import { formatDate } from '../../../utils/formatDate';
import * as fontkit from 'fontkit';

@Injectable()
export class DocumentService {
    constructor(private readonly prisma: PrismaService) {}

    async removeDocument(documentId: string) {
        const document = await this.prisma.document.delete({
            where: { id: documentId },
        });

        await fs.unlink(document.path);
    }

    async getDocument(documentId: string): Promise<Document | null> {
        return this.prisma.document.findFirst({
            where: {
                id: documentId,
            },
        });
    }

    async saveDocuments(
        documents: {
            name: string;
            path: string;
            passengerId: string;
            documentType: DocumentType;
        }[],
        claimId: string,
        isPublicData: boolean = false,
    ): Promise<Document[]> {
        return Promise.all(
            documents.map((doc) =>
                this.prisma.document.create({
                    data: {
                        name: doc.name,
                        path: doc.path,
                        claimId,
                        passengerId: doc.passengerId,
                        type: doc.documentType,
                    },
                    select: isPublicData
                        ? this.getPublicDataSelect()
                        : undefined,
                }),
            ),
        );
    }

    async saveParentalSignaturePdf(
        signatureDataUrl: string,
        documentData: {
            claimId: string;
            firstName: string;
            lastName: string;
            address: string;
            date: Date;
            flightNumber: string;
            airlineName: string;
            parentFirstName: string;
            parentLastName: string;
            minorBirthday: Date;
        },
    ): Promise<string> {
        const today = formatDate(new Date(), 'dd.mm.yyyy');

        const fontBoldBuffer = await fs.readFile(
            path.resolve(__dirname, '../../../../fonts/Inter', 'bold.ttf'),
        );
        const fontRegularBuffer = await fs.readFile(
            path.resolve(__dirname, '../../../../fonts/Inter', 'regular.ttf'),
        );

        const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
        const pngBuffer = Buffer.from(base64, 'base64');

        const templatePath = path.join(
            __dirname,
            '../../../../assets',
            'parental-assignment_agreement-template.pdf',
        );
        const templateBuffer = await fs.readFile(templatePath);

        const pdfDoc = await PDFDocument.load(templateBuffer);

        // @ts-ignore
        pdfDoc.registerFontkit(fontkit);

        const fontBold = await pdfDoc.embedFont(fontBoldBuffer);
        const fontRegular = await pdfDoc.embedFont(fontRegularBuffer);

        const firstPage = pdfDoc.getPages()[0];
        const secondPage = pdfDoc.getPages()[1];

        const pngImage = await pdfDoc.embedPng(pngBuffer);

        firstPage.drawText(today, {
            x: 270,
            y: 690,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(
            `${documentData.parentFirstName} ${documentData.parentLastName}`,
            {
                x: 67,
                y: 585,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
            {
                x: 304,
                y: 585,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(
            formatDate(documentData.minorBirthday, 'dd.mm.yyyy'),
            {
                x: 304,
                y: 543,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(documentData.address, {
            x: 67,
            y: 543,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontBold,
        });

        firstPage.drawText(documentData.claimId, {
            x: 130,
            y: 459,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.airlineName, {
            x: 130,
            y: 423,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.flightNumber, {
            x: 130,
            y: 392,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(formatDate(documentData.date, 'dd.mm.yyyy'), {
            x: 130,
            y: 361,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        secondPage.drawText(
            `${documentData.parentFirstName} ${documentData.parentLastName}`,
            {
                x: 55,
                y: 320,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontRegular,
            },
        );

        secondPage.drawImage(pngImage, {
            x: 110,
            y: 230,
            width: 160,
            height: 70,
        });

        const pdfBytes = await pdfDoc.save();

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}.pdf`;
        const filePath = path.join(UPLOAD_DIRECTORY_PATH, fileName);

        await fs.writeFile(filePath, pdfBytes);

        return filePath;
    }

    async saveSignaturePdf(
        signatureDataUrl: string,
        documentData: {
            claimId: string;
            firstName: string;
            lastName: string;
            address: string;
            date: Date;
            flightNumber: string;
            airlineName: string;
        },
    ) {
        const today = formatDate(new Date(), 'dd.mm.yyyy');

        const fontBoldBuffer = await fs.readFile(
            path.resolve(__dirname, '../../../../fonts/Inter', 'bold.ttf'),
        );
        const fontRegularBuffer = await fs.readFile(
            path.resolve(__dirname, '../../../../fonts/Inter', 'regular.ttf'),
        );

        const base64 = signatureDataUrl.replace(/^data:image\/png;base64,/, '');
        const pngBuffer = Buffer.from(base64, 'base64');

        const templatePath = path.join(
            __dirname,
            '../../../../assets',
            'assignment_agreement-template.pdf',
        );
        const templateBuffer = await fs.readFile(templatePath);

        const pdfDoc = await PDFDocument.load(templateBuffer);

        // @ts-ignore
        pdfDoc.registerFontkit(fontkit);

        const fontBold = await pdfDoc.embedFont(fontBoldBuffer);
        const fontRegular = await pdfDoc.embedFont(fontRegularBuffer);

        const firstPage = pdfDoc.getPages()[0];
        const secondPage = pdfDoc.getPages()[1];

        const pngImage = await pdfDoc.embedPng(pngBuffer);

        firstPage.drawText(today, {
            x: 270,
            y: 685,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(documentData.address, {
            x: 205,
            y: 630,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
            {
                x: 205,
                y: 650,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(documentData.claimId, {
            x: 140,
            y: 531,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.airlineName, {
            x: 140,
            y: 496,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.flightNumber, {
            x: 140,
            y: 465,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(formatDate(documentData.date, 'dd.mm.yyyy'), {
            x: 140,
            y: 434,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        secondPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
            {
                x: 55,
                y: 542,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontRegular,
            },
        );

        secondPage.drawImage(pngImage, {
            x: 105,
            y: 435,
            width: 160,
            height: 70,
        });

        const pdfBytes = await pdfDoc.save();

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}.pdf`;
        const filePath = path.join(UPLOAD_DIRECTORY_PATH, fileName);

        await fs.writeFile(filePath, pdfBytes);

        return filePath;
    }

    async updateType(
        newType: DocumentType,
        documentId: string,
        isPublicData: boolean = false,
    ): Promise<Document> {
        return this.prisma.document.update({
            data: {
                type: newType,
            },
            where: {
                id: documentId,
            },
            select: isPublicData ? this.getPublicDataSelect() : undefined,
        });
    }

    private async convertDocToPdf(inputPath: string, outputPath: string) {
        return new Promise<void>((resolve, reject) => {
            const libre = spawn('soffice', [
                '--headless',
                '--convert-to',
                'pdf',
                '--outdir',
                path.dirname(outputPath),
                inputPath,
            ]);

            libre.on('exit', (code: number) => {
                if (code === 0) resolve();
                else
                    reject(
                        new Error(
                            `LibreOffice conversion failed with code ${code}`,
                        ),
                    );
            });
        });
    }

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
                const img = await mergedPdf.embedPng(file.buffer);
                const page = mergedPdf.addPage([img.width, img.height]);
                page.drawImage(img, {
                    x: 0,
                    y: 0,
                    width: img.width,
                    height: img.height,
                });
            } else if (ext === '.doc' || ext === '.docx') {
                const tempInput = path.join('/tmp', file.originalname);
                const tempOutput = tempInput.replace(ext, '.pdf');
                await fs.writeFile(tempInput, file.buffer);
                await this.convertDocToPdf(tempInput, tempOutput);

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

    async getExpressMulterFilesFromPaths(filePaths: string[]) {
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

    async getDocumentByIds(ids: string[]) {
        return this.prisma.document.findMany({
            where: {
                id: { in: ids },
            },
        });
    }

    getPublicDataSelect() {
        return {
            id: true,
            name: true,
            type: true,
            claimId: true,
        };
    }

    async updatePassengerId(documentId: string, passengerId: string) {
        return this.prisma.document.update({
            where: {
                id: documentId,
            },
            data: {
                passengerId,
            },
            select: this.getPublicDataSelect(),
        });
    }
}
