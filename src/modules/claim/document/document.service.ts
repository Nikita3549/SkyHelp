import { Injectable } from '@nestjs/common';
import { Document } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import * as fs from 'fs/promises';
import * as path from 'path';
import { PDFDocument, rgb } from 'pdf-lib';
const fontkit = require('fontkit');

@Injectable()
export class DocumentService {
    constructor(private readonly prisma: PrismaService) {}

    async getDocument(documentId: string): Promise<Document | null> {
        return this.prisma.document.findFirst({
            where: {
                id: documentId,
            },
        });
    }

    async saveDocuments(
        documents: Omit<Omit<Document, 'id'>, 'claimId'>[],
        claimId: string,
    ): Promise<Document[]> {
        return Promise.all(
            documents.map((doc) =>
                this.prisma.document.create({
                    data: {
                        ...doc,
                        claimId,
                    },
                }),
            ),
        );
    }

    async doesAssignmentAgreementExist(claimId: string) {
        return this.prisma.document.count({
            where: {
                claimId,
                name: 'assignment_agreement.pdf',
            },
        });
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
        const today = this.formatDatePdf(new Date());

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

        firstPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
            {
                x: 205,
                y: 598,
                size: 10.5,
                color: rgb(0.333, 0.333, 0.333),
                font: fontRegular,
            },
        );

        firstPage.drawText(documentData.address, {
            x: 205,
            y: 618,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontBold,
        });

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

        firstPage.drawText(this.formatDatePdf(documentData.date), {
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
            y: 291 - 105,
            width: 160,
            height: 105,
        });

        const pdfBytes = await pdfDoc.save();

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}.pdf`;
        const uploadDir = path.join(__dirname, '../../../../uploads');
        const filePath = path.join(uploadDir, fileName);

        await fs.writeFile(filePath, pdfBytes);

        return filePath;
    }
    private formatDatePdf(date: Date): string {
        const d = date;
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();

        return `${day}.${month}.${year}`;
    }
}
