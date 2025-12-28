import { PDFDocument, PDFFont } from 'pdf-lib';

export interface IPreparePdfResult {
    pdfDoc: PDFDocument;
    fonts: {
        regular: PDFFont;
        medium: PDFFont;
        bold: PDFFont;
    };
}
