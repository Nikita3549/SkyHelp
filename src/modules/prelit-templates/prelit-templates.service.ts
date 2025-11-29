import { Injectable, OnModuleInit } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FontsDirectoryPath } from '../../common/constants/paths/FontsDirectoryPath';
import { ICoordinates } from './interfaces/coordinates.interface';
import { PrelitDirectoryPath } from '../../common/constants/paths/PrelitDirectoryPath';
import { PDFDocument, rgb } from 'pdf-lib';
import * as fontkit from 'fontkit';
import { UPLOAD_DIRECTORY_PATH } from '../../common/constants/paths/UploadsDirectoryPath';

@Injectable()
export class PrelitTemplatesService implements OnModuleInit {
    async onModuleInit() {
        await this.fillTemplate(
            [
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 12,
                    text: 'Nikita Tsarenko',
                    x: 290,
                    y: 599,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '123456',
                    x: 422,
                    y: 566,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '21.11.2025',
                    x: 482,
                    y: 566,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '123456',
                    x: 342,
                    y: 406,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '21.11.2025',
                    x: 419,
                    y: 406,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: 'Nikita Tsarenko',
                    x: 214,
                    y: 378,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '5F3643',
                    x: 108,
                    y: 322,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: 'Charles de Gaulle International Airport(D)',
                    x: 243,
                    y: 322,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: 'Charles de Gaulle International Airport(A)',
                    x: 107,
                    y: 308,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '25.10.2025',
                    x: 342,
                    y: 308,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: 'Nikita Tsarenko',
                    x: 154,
                    y: 254,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '5F3234',
                    x: 380,
                    y: 228,
                    fontWeight: 'BOLD',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: 'Charles de Gaulle International Airport(D)',
                    x: 169,
                    y: 202,
                    fontWeight: 'REGULAR',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: 'Charles de Gaulle International Airport',
                    x: 101,
                    y: 176,
                    fontWeight: 'REGULAR',
                },
                {
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '25.11.2025',
                    x: 242,
                    y: 150,
                    fontWeight: 'BOLD',
                },
                {
                    // NEW
                    page: 1,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: 'Charles de Gaulle International Airport(D)',
                    x: 99,
                    y: 80,
                    fontWeight: 'REGULAR',
                },
                {
                    page: 2,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '25.11.2025',
                    x: 175,
                    y: 431,
                    fontWeight: 'BOLD',
                },
                {
                    page: 2,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '123456',
                    x: 224,
                    y: 414,
                    fontWeight: 'BOLD',
                },
                {
                    page: 2,
                    color: rgb(0, 0, 0),
                    size: 10.5,
                    text: '20.11.2025',
                    x: 466,
                    y: 136,
                    fontWeight: 'BOLD',
                },
            ],
            'flyone_ro_250_overbooking.pdf',
        );
    }
    async fillTemplate(coordinates: ICoordinates[], templateFileName: string) {
        const templatePath = path.join(PrelitDirectoryPath, templateFileName);
        const templateBuffer = await fs.readFile(templatePath);
        const templatePdfDoc = await PDFDocument.load(templateBuffer);
        // @ts-ignore
        templatePdfDoc.registerFontkit(fontkit);
        const fontRegularBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Cambria', 'regular.ttf'),
        );
        const fontBoldBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Cambria', 'bold.ttf'),
        );
        const fontRegular = await templatePdfDoc.embedFont(fontRegularBuffer);
        const fontBold = await templatePdfDoc.embedFont(fontBoldBuffer);

        for (let i = 0; i < coordinates.length; i++) {
            const coordinate = coordinates[i];
            const page = templatePdfDoc.getPage(coordinate.page - 1);

            page.drawText(coordinate.text, {
                x: coordinate.x,
                y: coordinate.y,
                size: coordinate.size,
                color: coordinate.color,
                font:
                    coordinate.fontWeight == 'REGULAR' ? fontRegular : fontBold,
            });
        }

        const pdfBytes = await templatePdfDoc.save();

        const fileName = `test.pdf`;
        const filePath = path.join(UPLOAD_DIRECTORY_PATH, fileName);

        await fs.writeFile(filePath, pdfBytes);

        return pdfBytes;
    }
}
