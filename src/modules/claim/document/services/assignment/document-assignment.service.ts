import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PDFDocument, PDFFont, PDFPage } from 'pdf-lib';
import { Document, DocumentType } from '@prisma/client';
import { generateAssignmentName } from '../../../../../common/utils/generate-assignment-name';
import { formatDate } from '../../../../../common/utils/formatDate';
import * as fs from 'fs/promises';
import * as fontkit from 'fontkit';
import { DocumentService } from '../document.service';
import { S3Service } from '../../../../s3/s3.service';
import { IAssignmentFonts } from './interfaces/assignment-fonts.interface';
import { IAssignmentTemplates } from './interfaces/assignment-templates.interface';
import { IAssignmentData } from './interfaces/assignment-data.interface';
import { IParentalAssignmentData } from './interfaces/parental-assignment-data.interface';
import { IAssignmentSignature } from './interfaces/assignment-signature.interface';
import { logDocumentWithoutS3Key } from '../../utils/logDocumentWithoutS3Key';
import { ISignatureRectangle } from './interfaces/signature-rectangle.interface';
import { COLORS } from './constants/colors';
import { FONT_SIZE } from './constants/font-size';
import { ASSIGNMENT } from './constants/assignment';
import { Fontkit } from 'pdf-lib/es/types/fontkit';
import { ASSIGNMENT_AGREEMENT_FILEPATH } from './constants/template-filepath';
import { FONT_FAMILY_FILEPATH } from './constants/font-family-filepath';
import { IPreparePdfResult } from './interfaces/prepare-pdf-result.interface';
import { IFullClaim } from '../../../interfaces/full-claim.interface';
import { BasePassenger } from '../../../interfaces/base-passenger.interface';

@Injectable()
export class DocumentAssignmentService implements OnModuleInit {
    fontFamilies: IAssignmentFonts;
    assignmentTemplates: IAssignmentTemplates;

    constructor(
        @Inject(forwardRef(() => DocumentService))
        private readonly documentService: DocumentService,
        private readonly S3Service: S3Service,
    ) {}

    async onModuleInit() {
        this.fontFamilies = {
            Inter: {
                Regular: await fs.readFile(FONT_FAMILY_FILEPATH.INTER.REGULAR),
                Medium: await fs.readFile(FONT_FAMILY_FILEPATH.INTER.MEDIUM),
                Bold: await fs.readFile(FONT_FAMILY_FILEPATH.INTER.BOLD),
            },
        };

        this.assignmentTemplates = {
            regular: await fs.readFile(ASSIGNMENT_AGREEMENT_FILEPATH.REGULAR),
            parental: await fs.readFile(ASSIGNMENT_AGREEMENT_FILEPATH.PARENTAL),
        };
    }

    async saveSignature(
        signature: IAssignmentSignature,
        assignmentData: IAssignmentData,
    ): Promise<{ buffer: Buffer }> {
        const { pdfDoc, fonts } = await this.preparePdf(
            this.assignmentTemplates.regular,
        );
        const titlePage =
            pdfDoc.getPages()[ASSIGNMENT.REGULAR.PAGE_INDEX.TITLE];
        const signaturePage =
            pdfDoc.getPages()[ASSIGNMENT.REGULAR.PAGE_INDEX.SIGNATURE];

        // <--- TEXTS --->
        await this.fillRegularText(
            titlePage,
            signaturePage,
            assignmentData,
            fonts,
        );

        // <--- SIGNATURE --->
        const signatureRect: ISignatureRectangle = {
            x: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.X,
            y: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.Y,
            width: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.WIDTH,
            height: ASSIGNMENT.REGULAR.COORDINATES.SIGNATURE.HEIGHT,
            page: ASSIGNMENT.REGULAR.PAGE_INDEX.SIGNATURE,
        };

        await this.embedSignature({
            signature,
            pdfDoc,
            signaturePage,
            signatureRect,
        });

        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        return { buffer: pdfBuffer };
    }

    async saveParentalSignature(
        signature: IAssignmentSignature,
        assignmentData: IParentalAssignmentData,
    ): Promise<{ buffer: Buffer }> {
        const { pdfDoc, fonts } = await this.preparePdf(
            this.assignmentTemplates.parental,
        );
        const titlePage =
            pdfDoc.getPages()[ASSIGNMENT.PARENTAL.PAGE_INDEX.TITLE];
        const signaturePage =
            pdfDoc.getPages()[ASSIGNMENT.PARENTAL.PAGE_INDEX.SIGNATURE];

        // <--- TEXTS --->
        await this.fillParentalText(
            titlePage,
            signaturePage,
            assignmentData,
            fonts,
        );

        // <--- SIGNATURE --->
        const signatureRect: ISignatureRectangle = {
            x: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.X,
            y: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.Y,
            width: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.WIDTH,
            height: ASSIGNMENT.PARENTAL.COORDINATES.SIGNATURE.HEIGHT,
            page: ASSIGNMENT.PARENTAL.PAGE_INDEX.SIGNATURE,
        };

        await this.embedSignature({
            signature,
            pdfDoc,
            signaturePage,
            signatureRect,
        });

        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        return {
            buffer: pdfBuffer,
        };
    }

    async updateAssignmentData(claim: IFullClaim, passengerIds: string[]) {
        const passengers = this.getTargetPassengers(claim, passengerIds);

        for (const passenger of passengers) {
            const assignments = claim.documents.filter(
                (a) =>
                    a.passengerId == passenger.id &&
                    a.type == DocumentType.ASSIGNMENT &&
                    !a.deletedAt,
            );

            for (const assignment of assignments) {
                await this.processUpdateAssignment(
                    claim,
                    passenger,
                    assignment,
                );
            }
        }
    }

    // <--- PRIVATE HELPERS --->
    private getTargetPassengers(
        claim: IFullClaim,
        passengerIds: string[],
    ): BasePassenger[] {
        const passengers: BasePassenger[] = [];

        if (passengerIds.includes(claim.customer.id)) {
            passengers.push({
                ...claim.customer,
                isCustomer: true,
                isMinor: false,
                claimId: claim.id,
            });
        }

        const otherPassengers = claim.passengers
            .filter((p) => passengerIds.includes(p.id))
            .map((p) => ({
                ...p,
                isCustomer: false as const,
            }));

        passengers.push(...otherPassengers);

        return passengers;
    }

    private async processUpdateAssignment(
        claim: IFullClaim,
        passenger: BasePassenger,
        assignment: Document,
    ) {
        if (!assignment.s3Key) {
            logDocumentWithoutS3Key(assignment.id);
            return;
        }

        const assignmentData = {
            address: passenger.address,
            airlineName: claim.details.airlines.name,
            firstName: passenger.firstName,
            date: claim.details.date,
            claimId: claim.id,
            lastName: passenger.lastName,
            flightNumber: claim.details.flightNumber,
            fileName: assignment.name,
        };
        const file = !passenger.isMinor
            ? await this.saveSignature(
                  {
                      sourceS3Key: assignment.s3Key,
                  },
                  assignmentData,
              )
            : await this.saveParentalSignature(
                  {
                      sourceS3Key: assignment.s3Key,
                  },
                  {
                      ...assignmentData,
                      parentLastName: passenger.parentLastName!,
                      parentFirstName: passenger.parentFirstName!,
                      minorBirthday: passenger.birthday!,
                  },
              );

        await this.documentService.removeDocument(assignment.id);

        await this.documentService.saveDocuments(
            [
                {
                    name: generateAssignmentName(
                        passenger.firstName,
                        passenger.lastName,
                    ),
                    buffer: file.buffer,
                    passengerId: assignment.passengerId,
                    documentType: assignment.type,
                    mimetype: 'application/pdf',
                },
            ],
            claim.id,
        );
    }

    private async embedSignature(params: {
        signature: IAssignmentSignature;
        pdfDoc: PDFDocument;
        signaturePage: PDFPage;
        signatureRect: ISignatureRectangle;
    }) {
        const { signature, pdfDoc, signaturePage, signatureRect } = params;

        if (!!signature.imageDataUrl == !!signature.sourceS3Key) {
            throw new Error(
                'You must provide exactly one of: signature.imageDataUrl OR signature.sourceS3Key',
            );
        }

        // Signature from Base64 PNG
        if (signature.imageDataUrl) {
            const base64 = signature.imageDataUrl.replace(
                /^data:image\/png;base64,/,
                '',
            );
            const pngBuffer = Buffer.from(base64, 'base64');
            const pngImage = await pdfDoc.embedPng(pngBuffer);
            signaturePage.drawImage(pngImage, signatureRect);
        }

        // Signature extracted from source PDF document stored in S3
        if (signature.sourceS3Key) {
            await this.insertSignatureFromSource({
                sourceS3Key: signature.sourceS3Key,
                targetPage: signaturePage,
                signatureRect,
            });
        }
    }

    private async preparePdf(
        assignmentTemplate: Buffer,
    ): Promise<IPreparePdfResult> {
        const pdfDoc = await PDFDocument.load(assignmentTemplate);

        pdfDoc.registerFontkit(fontkit as unknown as Fontkit);

        const [regular, medium, bold] = await Promise.all([
            await pdfDoc.embedFont(this.fontFamilies.Inter.Regular),
            await pdfDoc.embedFont(this.fontFamilies.Inter.Medium),
            await pdfDoc.embedFont(this.fontFamilies.Inter.Bold),
        ]);

        return {
            pdfDoc,
            fonts: {
                regular,
                medium,
                bold,
            },
        };
    }

    private async insertSignatureFromSource(assignmentData: {
        sourceS3Key: string;
        targetPage: PDFPage;
        signatureRect: ISignatureRectangle;
    }): Promise<{ page: PDFPage }> {
        const { sourceS3Key, targetPage, signatureRect } = assignmentData;

        const targetDoc = targetPage.doc;

        const sourceBuffer = await this.S3Service.getBuffer(sourceS3Key);
        const sourceDoc = await PDFDocument.load(sourceBuffer);

        const sourcePageIndex = signatureRect.page;
        const sourcePage = sourceDoc.getPage(sourcePageIndex);

        const signatureFragment = await targetDoc.embedPage(sourcePage, {
            left: signatureRect.x,
            bottom: signatureRect.y,
            right: signatureRect.x + signatureRect.width,
            top: signatureRect.y + signatureRect.height,
        });

        targetPage.drawPage(signatureFragment, {
            x: signatureRect.x,
            y: signatureRect.y,
            width: signatureRect.width,
            height: signatureRect.height,
        });

        return {
            page: targetPage,
        };
    }

    private async fillRegularText(
        titlePage: PDFPage,
        signaturePage: PDFPage,
        assignmentData: IAssignmentData,
        fonts: {
            regular: PDFFont;
            medium: PDFFont;
            bold: PDFFont;
        },
    ) {
        const today = formatDate(new Date(), 'dd.MMMM.yyyy');
        titlePage.drawText(today, {
            x: 253,
            y: 685,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.GRAY,
            font: fonts.regular,
        });

        titlePage.drawText(assignmentData.address, {
            x: 55,
            y: 605,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.GRAY,
            font: fonts.regular,
        });

        titlePage.drawText(
            `${assignmentData.firstName} ${assignmentData.lastName}`,
            {
                x: 55,
                y: 625,
                size: FONT_SIZE.MEDIUM,
                color: COLORS.BLACK,
                font: fonts.bold,
            },
        );

        titlePage.drawText(assignmentData.claimId, {
            x: 130,
            y: 521,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        titlePage.drawText(assignmentData.airlineName, {
            x: 130,
            y: 490,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        titlePage.drawText(assignmentData.flightNumber, {
            x: 370,
            y: 521,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        titlePage.drawText(formatDate(assignmentData.date, 'dd.mm.yyyy'), {
            x: 370,
            y: 490,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        signaturePage.drawText(
            `${assignmentData.firstName} ${assignmentData.lastName}`,
            {
                x: 55,
                y: 264,
                size: FONT_SIZE.MEDIUM,
                color: COLORS.BLACK,
                font: fonts.medium,
            },
        );
    }

    private async fillParentalText(
        titlePage: PDFPage,
        signaturePage: PDFPage,
        assignmentData: IParentalAssignmentData,
        fonts: {
            regular: PDFFont;
            medium: PDFFont;
            bold: PDFFont;
        },
    ) {
        const today = formatDate(new Date(), 'dd.mm.yyyy');
        titlePage.drawText(today, {
            x: 270,
            y: 690,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.GRAY,
            font: fonts.regular,
        });

        titlePage.drawText(
            `${assignmentData.parentFirstName} ${assignmentData.parentLastName}`,
            {
                x: 67,
                y: 585,
                size: FONT_SIZE.MEDIUM,
                color: COLORS.BLACK,
                font: fonts.bold,
            },
        );

        titlePage.drawText(
            `${assignmentData.firstName} ${assignmentData.lastName}`,
            {
                x: 304,
                y: 585,
                size: FONT_SIZE.MEDIUM,
                color: COLORS.BLACK,
                font: fonts.bold,
            },
        );

        titlePage.drawText(
            formatDate(assignmentData.minorBirthday, 'dd.mm.yyyy'),
            {
                x: 304,
                y: 543,
                size: FONT_SIZE.MEDIUM,
                color: COLORS.BLACK,
                font: fonts.bold,
            },
        );

        titlePage.drawText(assignmentData.address, {
            x: 67,
            y: 543,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.bold,
        });

        titlePage.drawText(assignmentData.claimId, {
            x: 130,
            y: 453,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        titlePage.drawText(assignmentData.airlineName, {
            x: 130,
            y: 422,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        titlePage.drawText(assignmentData.flightNumber, {
            x: 370,
            y: 453,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        titlePage.drawText(formatDate(assignmentData.date, 'dd.mm.yyyy'), {
            x: 370,
            y: 422,
            size: FONT_SIZE.MEDIUM,
            color: COLORS.BLACK,
            font: fonts.regular,
        });

        signaturePage.drawText(
            `${assignmentData.parentFirstName} ${assignmentData.parentLastName}`,
            {
                x: 55,
                y: 556,
                size: FONT_SIZE.MEDIUM,
                color: COLORS.BLACK,
                font: fonts.medium,
            },
        );
    }
}
