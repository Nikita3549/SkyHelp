import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FontsDirectoryPath } from '../../common/constants/paths/FontsDirectoryPath';
import { ICoordinates } from './interfaces/coordinates.interface';
import { PrelitDirectoryPath } from '../../common/constants/paths/PrelitDirectoryPath';
import { PDFDocument } from 'pdf-lib';
import * as fontkit from 'fontkit';

@Injectable()
export class PrelitTemplatesService {
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

        return pdfBytes;
    }
}
