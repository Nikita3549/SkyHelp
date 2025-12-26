import { forwardRef, Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { PDFDocument, PDFPage, rgb } from 'pdf-lib';
import { DocumentType, OtherPassenger } from '@prisma/client';
import { generateAssignmentName } from '../../../../../common/utils/generate-assignment-name';
import { formatDate } from '../../../../../common/utils/formatDate';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FontsDirectoryPath } from '../../../../../common/constants/paths/FontsDirectoryPath';
import { AssignmentsDirectoryPath } from '../../../../../common/constants/paths/AssignmentsDirectoryPath';
import * as fontkit from 'fontkit';
import { ClaimService } from '../../../claim.service';
import { DocumentService } from '../document.service';
import { S3Service } from '../../../../s3/s3.service';
import { IAssignmentFonts } from './interfaces/assignment-fonts.interface';
import { IAssignmentTemplates } from './interfaces/assignment-templates.interface';
import { IAssignmentData } from './interfaces/assignment-data.interface';
import { IParentalAssignmentData } from './interfaces/parental-assignment-data.interface';
import { IAssignmentSignature } from './interfaces/assignment-signature.interface';
import { logDocumentWithoutS3Key } from '../../utils/logDocumentWithoutS3Key';
import { ISignatureRectangle } from './interfaces/signature-rectangle.interface';
import { IAssignmentPassenger } from './interfaces/assignment-passenger.interfaces';

@Injectable()
export class DocumentAssignmentService implements OnModuleInit {
    fonts: IAssignmentFonts;
    assignmentTemplates: IAssignmentTemplates;

    constructor(
        private readonly claimService: ClaimService,
        @Inject(forwardRef(() => DocumentService))
        private readonly documentService: DocumentService,
        private readonly S3Service: S3Service,
    ) {}

    async onModuleInit() {
        this.fonts = {
            Inter: {
                Regular: await fs.readFile(
                    path.resolve(FontsDirectoryPath, 'Inter', 'regular.ttf'),
                ),
                Medium: await fs.readFile(
                    path.resolve(FontsDirectoryPath, 'Inter', 'medium.ttf'),
                ),
                Bold: await fs.readFile(
                    path.resolve(FontsDirectoryPath, 'Inter', 'bold.ttf'),
                ),
            },
        };

        this.assignmentTemplates = {
            regular: await fs.readFile(
                path.join(
                    AssignmentsDirectoryPath,
                    'assignment_agreement-template.pdf',
                ),
            ),
            parental: await fs.readFile(
                path.join(
                    AssignmentsDirectoryPath,
                    'parental-assignment_agreement-template.pdf',
                ),
            ),
        };
    }

    private async insertSignatureFromSource(assignmentData: {
        sourceKey: string;
        targetPage: PDFPage;
        signatureRect: ISignatureRectangle;
    }): Promise<{ page: PDFPage }> {
        const { sourceKey, targetPage, signatureRect } = assignmentData;

        const targetDoc = targetPage.doc;

        const sourceBuffer = await this.S3Service.getBuffer(sourceKey);
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

    async updateAssignmentData(claimId: string, passengerIds: string[]) {
        const claim = await this.claimService.getClaim(claimId, {
            documentsWithPath: true,
        });

        if (!claim) {
            return;
        }

        for (const passengerId of passengerIds) {
            try {
                const passenger: IAssignmentPassenger | undefined =
                    claim.customer.id == passengerId
                        ? {
                              isMinor: false,
                              ...claim.customer,
                          }
                        : claim.passengers.find((p) => p.id == passengerId);

                if (!passenger) {
                    continue;
                }

                const assignments = claim.documents.filter(
                    (a) =>
                        a.passengerId == passengerId &&
                        a.type == DocumentType.ASSIGNMENT &&
                        !a.deletedAt,
                );

                for (const assignment of assignments) {
                    try {
                        let file: { buffer: Buffer };

                        if (!assignment.s3Key) {
                            logDocumentWithoutS3Key(assignment.id);
                            continue;
                        }
                        if (!passenger.isMinor) {
                            file = await this.saveSignature(
                                {
                                    sourceS3Key: assignment.s3Key,
                                },
                                {
                                    address: passenger.address,
                                    airlineName: claim.details.airlines.name,
                                    firstName: passenger.firstName,
                                    date: claim.details.date,
                                    claimId: claim.id,
                                    lastName: passenger.lastName,
                                    flightNumber: claim.details.flightNumber,
                                    fileName: assignment.name,
                                },
                            );
                        } else {
                            const otherPassenger = passenger;

                            file = await this.saveParentalSignature(
                                {
                                    sourceS3Key: assignment.s3Key,
                                },
                                {
                                    address: otherPassenger.address,
                                    airlineName: claim.details.airlines.name,
                                    firstName: otherPassenger.firstName,
                                    date: claim.details.date,
                                    claimId: claim.id,
                                    fileName: assignment.name,
                                    lastName: otherPassenger.lastName,
                                    flightNumber: claim.details.flightNumber,
                                    parentLastName:
                                        otherPassenger.parentLastName!,
                                    parentFirstName:
                                        otherPassenger.parentFirstName!,
                                    minorBirthday: otherPassenger.birthday!,
                                },
                            );
                        }

                        await this.documentService.removeDocument(
                            assignment.id,
                        );

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
                    } catch (_e) {}
                }
            } catch (_e) {}
        }
    }

    async saveParentalSignature(
        signature: IAssignmentSignature,
        assignmentData: IParentalAssignmentData,
    ): Promise<{ buffer: Buffer }> {
        const today = formatDate(new Date(), 'dd.mm.yyyy');

        const pdfDoc = await PDFDocument.load(
            this.assignmentTemplates.parental,
        );

        // @ts-ignore
        pdfDoc.registerFontkit(fontkit);

        const fontRegular = await pdfDoc.embedFont(this.fonts.Inter.Regular);
        const fontMedium = await pdfDoc.embedFont(this.fonts.Inter.Medium);
        const fontBold = await pdfDoc.embedFont(this.fonts.Inter.Bold);

        const firstPage = pdfDoc.getPages()[0];
        const fourthPage = pdfDoc.getPages()[3];

        let pngImage;
        if (signature.imageDataUrl) {
            const base64 = signature.imageDataUrl.replace(
                /^data:image\/png;base64,/,
                '',
            );
            const pngBuffer = Buffer.from(base64, 'base64');
            pngImage = await pdfDoc.embedPng(pngBuffer);
        }

        firstPage.drawText(today, {
            x: 270,
            y: 690,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(
            `${assignmentData.parentFirstName} ${assignmentData.parentLastName}`,
            {
                x: 67,
                y: 585,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(
            `${assignmentData.firstName} ${assignmentData.lastName}`,
            {
                x: 304,
                y: 585,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(
            formatDate(assignmentData.minorBirthday, 'dd.mm.yyyy'),
            {
                x: 304,
                y: 543,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(assignmentData.address, {
            x: 67,
            y: 543,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontBold,
        });

        firstPage.drawText(assignmentData.claimId, {
            x: 130,
            y: 453,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(assignmentData.airlineName, {
            x: 130,
            y: 422,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(assignmentData.flightNumber, {
            x: 370,
            y: 453,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(formatDate(assignmentData.date, 'dd.mm.yyyy'), {
            x: 370,
            y: 422,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        fourthPage.drawText(
            `${assignmentData.parentFirstName} ${assignmentData.parentLastName}`,
            {
                x: 55,
                y: 556,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontMedium,
            },
        );

        if (pngImage) {
            fourthPage.drawImage(pngImage, {
                x: 110,
                y: 445,
                width: 160,
                height: 70,
            });
        }

        if (signature.sourceS3Key) {
            await this.insertSignatureFromSource({
                sourceKey: signature.sourceS3Key,
                targetPage: fourthPage,
                signatureRect: {
                    width: 160,
                    height: 70,
                    x: 110,
                    y: 445,
                    page: 3,
                },
            });
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        return {
            buffer: pdfBuffer,
        };
    }

    async saveSignature(
        signature: IAssignmentSignature,
        assignmentData: IAssignmentData,
    ): Promise<{ buffer: Buffer }> {
        if (!!signature.imageDataUrl == !!signature.sourceS3Key) {
            throw new Error(
                'You must provide exactly one of: signature.imageDataUrl OR signature.sourceS3Key',
            );
        }

        const today = formatDate(new Date(), 'dd.MMMM.yyyy');

        const pdfDoc = await PDFDocument.load(this.assignmentTemplates.regular);

        // @ts-ignore
        pdfDoc.registerFontkit(fontkit);

        const fontRegular = await pdfDoc.embedFont(this.fonts.Inter.Regular);
        const fontMedium = await pdfDoc.embedFont(this.fonts.Inter.Medium);
        const fontBold = await pdfDoc.embedFont(this.fonts.Inter.Bold);

        const firstPage = pdfDoc.getPages()[0];
        const thirdPage = pdfDoc.getPages()[2];

        let pngImage;
        if (signature.imageDataUrl) {
            const base64 = signature.imageDataUrl.replace(
                /^data:image\/png;base64,/,
                '',
            );
            const pngBuffer = Buffer.from(base64, 'base64');
            pngImage = await pdfDoc.embedPng(pngBuffer);
        }

        firstPage.drawText(today, {
            x: 253,
            y: 685,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(assignmentData.address, {
            x: 55,
            y: 605,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(
            `${assignmentData.firstName} ${assignmentData.lastName}`,
            {
                x: 55,
                y: 625,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(assignmentData.claimId, {
            x: 130,
            y: 521,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(assignmentData.airlineName, {
            x: 130,
            y: 490,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(assignmentData.flightNumber, {
            x: 370,
            y: 521,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(formatDate(assignmentData.date, 'dd.mm.yyyy'), {
            x: 370,
            y: 490,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        thirdPage.drawText(
            `${assignmentData.firstName} ${assignmentData.lastName}`,
            {
                x: 55,
                y: 264,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontMedium,
            },
        );

        if (pngImage) {
            thirdPage.drawImage(pngImage, {
                x: 105,
                y: 157,
                width: 160,
                height: 70,
            });
        }

        if (signature.sourceS3Key) {
            await this.insertSignatureFromSource({
                sourceKey: signature.sourceS3Key,
                targetPage: thirdPage,
                signatureRect: {
                    x: 105,
                    y: 157,
                    width: 160,
                    height: 70,
                    page: 2,
                },
            });
        }

        const pdfBytes = await pdfDoc.save();
        const pdfBuffer = Buffer.from(pdfBytes);

        return { buffer: pdfBuffer };
    }
}
