import { Injectable, OnModuleInit } from '@nestjs/common';
import { Document, DocumentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
import { UPLOAD_DIRECTORY_PATH } from '../../../constants/UploadsDirectoryPath';
import { spawn } from 'child_process';
import { Readable } from 'stream';
import { formatDate } from '../../../utils/formatDate';
import * as fontkit from 'fontkit';

@Injectable()
export class DocumentService implements OnModuleInit {
    constructor(private readonly prisma: PrismaService) {}

    async getDocument(documentId: string): Promise<Document | null> {
        return this.prisma.document.findFirst({
            where: {
                id: documentId,
            },
        });
    }

    async saveDocuments(
        documents: Omit<Omit<Omit<Document, 'id'>, 'claimId'>, 'type'>[],
        claimId: string,
        documentType: DocumentType,
        isPublicData: boolean = false,
    ): Promise<Document[]> {
        return Promise.all(
            documents.map((doc) =>
                this.prisma.document.create({
                    data: {
                        ...doc,
                        claimId,
                        type: documentType,
                    },
                    select: isPublicData
                        ? this.getPublicDataSelect()
                        : undefined,
                }),
            ),
        );
    }

    onModuleInit() {
        this.saveParentalSignaturePdf(
            'data:image/png;base64,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',
            {
                claimId: '123456',
                firstName: 'Minor FirstName',
                lastName: 'Minor LastName',
                address: 'Address',
                date: new Date(2024, 3, 15),
                flightNumber: 'AF1234',
                airlineName: 'Air France',
                parentFirstName: 'Parent FirstName',
                parentLastName: 'Parent LastName',
                minorBirthday: new Date(2015, 1, 1),
            },
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
                y: 325,
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
            y: 640,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(documentData.address, {
            x: 205,
            y: 598,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
            {
                x: 205,
                y: 618,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(documentData.claimId, {
            x: 180,
            y: 502,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.airlineName, {
            x: 180,
            y: 467,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.flightNumber, {
            x: 180,
            y: 436,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(formatDate(documentData.date, 'dd.mm.yyyy'), {
            x: 180,
            y: 405,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        secondPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
            {
                x: 100,
                y: 308,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontRegular,
            },
        );

        secondPage.drawImage(pngImage, {
            x: 150,
            y: 217,
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

    async mergeFiles(files: Express.Multer.File[]): Promise<Buffer> {
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

        return Buffer.from(await mergedPdf.save());
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
}
