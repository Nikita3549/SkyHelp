import { PDFDocument } from 'pdf-lib';
import sharp from 'sharp';
import { BadRequestException } from '@nestjs/common';
import { COMPRESSION_THRESHOLD_BYTES } from './constants';

// compress image
export const compressImage = async (
    buffer: Buffer,
    ext: string,
): Promise<Buffer> => {
    const image = sharp(buffer).resize({
        width: 1024,
        withoutEnlargement: true,
    });

    if (ext === '.jpg' || ext === '.jpeg') {
        return image.jpeg({ quality: 80 }).toBuffer();
    }

    if (ext === '.png') {
        return image.png({ compressionLevel: 9 }).toBuffer();
    }

    return image.toBuffer();
};

// naive pdf compression with pdf-lib
export const compressPDFWithPdfLib = async (
    buffer: Buffer,
): Promise<Buffer> => {
    const pdfDoc = await PDFDocument.load(buffer);
    const bytes = await pdfDoc.save({ useObjectStreams: false });
    return Buffer.from(bytes);
};

export const processFile = async (
    buffer: Buffer,
    fileType: string,
): Promise<Buffer> => {
    let processed = buffer;

    // compress only if file is above threshold
    if (buffer.length > COMPRESSION_THRESHOLD_BYTES) {
        if (fileType === '.pdf') {
            processed = await compressPDFWithPdfLib(buffer);
        } else if (['.png', '.jpg', '.jpeg'].includes(fileType)) {
            processed = await compressImage(buffer, fileType);
        }
    }

    // final size check
    if (processed.length > COMPRESSION_THRESHOLD_BYTES) {
        throw new BadRequestException(
            `File is too large even after compression. Max size allowed is ${COMPRESSION_THRESHOLD_BYTES / 1024}KB`,
        );
    }

    return processed;
};
