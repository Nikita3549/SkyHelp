import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb } from 'pdf-lib';
import { DocumentType, OtherPassenger } from '@prisma/client';
import { generateAssignmentName } from '../../../../../common/utils/generate-assignment-name';
import { formatDate } from '../../../../../common/utils/formatDate';
import * as fs from 'fs/promises';
import * as path from 'path';
import { FontsDirectoryPath } from '../../../../../common/constants/paths/FontsDirectoryPath';
import { AssignmentsDirectoryPath } from '../../../../../common/constants/paths/AssignmentsDirectoryPath';
import * as fontkit from 'fontkit';
import { UPLOAD_DIRECTORY_PATH } from '../../../../../common/constants/paths/UploadsDirectoryPath';
import { ClaimService } from '../../../claim.service';
import { DocumentDbService } from '../database/document-db.service';
import {
    IAssignmentData,
    IAssignmentPassenger,
    IParentalAssignmentData,
    ISignatureRectangle,
} from './interfaces/assignment.interfaces';

@Injectable()
export class DocumentAssignmentService {
    constructor(
        private readonly claimService: ClaimService,
        private readonly documentDbService: DocumentDbService,
    ) {}

    private async insertSignatureFromSource(
        sourcePath: string,
        targetPath: string,
        outputPath: string,
        isOldAssignment: boolean = false,
        signatureRect?: ISignatureRectangle,
    ) {
        const sourceBuffer = await fs.readFile(sourcePath);
        const targetBuffer = await fs.readFile(targetPath);

        const sourcePdf = await PDFDocument.load(sourceBuffer);
        const targetPdf = await PDFDocument.load(targetBuffer);

        const sourcePageIndex = signatureRect?.page || 1;
        const sourcePage = sourcePdf.getPage(sourcePageIndex);

        const targetPage = targetPdf.getPage(2);

        if (!signatureRect && isOldAssignment) {
            signatureRect = {
                x: 150,
                y: 217 - 30,
                width: 160,
                height: 100,
            };
        } else if (!signatureRect) {
            signatureRect = {
                x: 105,
                y: 435,
                width: 160,
                height: 70,
            };
        }

        const embeddedPage = await targetPdf.embedPage(sourcePage, {
            left: signatureRect.x,
            bottom: signatureRect.y,
            right: signatureRect.x + signatureRect.width,
            top: signatureRect.y + signatureRect.height,
        });

        targetPage.drawPage(embeddedPage, {
            x: 100,
            y: isOldAssignment ? 157 - 30 : 157,
            xScale: 1,
            yScale: 1,
        });

        const updatedPdf = await targetPdf.save();
        await fs.writeFile(outputPath, updatedPdf);

        return outputPath;
    }
    private async insertParentalSignatureFromSource(
        sourcePath: string,
        targetPath: string,
        outputPath: string,
        isOldAssignment: boolean = false,
        signatureRect?: ISignatureRectangle,
    ) {
        const sourceBuffer = await fs.readFile(sourcePath);
        const targetBuffer = await fs.readFile(targetPath);

        const sourcePdf = await PDFDocument.load(sourceBuffer);
        const targetPdf = await PDFDocument.load(targetBuffer);

        const sourcePageIndex = signatureRect?.page || 1;
        const sourcePage = sourcePdf.getPage(sourcePageIndex);

        const targetPage = targetPdf.getPage(3);

        if (!signatureRect && isOldAssignment) {
            signatureRect = {
                x: 110,
                y: 228 - 30,
                width: 160,
                height: 100,
            };
        } else if (!signatureRect) {
            signatureRect = {
                x: 110,
                y: 228,
                width: 160,
                height: 70,
            };
        }

        const embeddedPage = await targetPdf.embedPage(sourcePage, {
            left: signatureRect.x,
            bottom: signatureRect.y,
            right: signatureRect.x + signatureRect.width,
            top: signatureRect.y + signatureRect.height,
        });

        targetPage.drawPage(embeddedPage, {
            x: 110,
            y: isOldAssignment ? 445 - 30 : 445,
            xScale: 1,
            yScale: 1,
        });

        const updatedPdf = await targetPdf.save();
        await fs.writeFile(outputPath, updatedPdf);

        return outputPath;
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
                        let filepath: string;

                        if (!passenger.isMinor) {
                            filepath = await this.saveSignaturePdf(
                                null,
                                {
                                    address: passenger.address,
                                    airlineName: claim.details.airlines.name,
                                    firstName: passenger.firstName,
                                    date: claim.details.date,
                                    claimId: claim.id,
                                    lastName: passenger.lastName,
                                    flightNumber: claim.details.flightNumber,
                                },
                                assignment.path,
                            );
                        } else {
                            const otherPassenger = passenger as OtherPassenger;

                            filepath = await this.saveParentalSignaturePdf(
                                null,
                                {
                                    address: otherPassenger.address,
                                    airlineName: claim.details.airlines.name,
                                    firstName: otherPassenger.firstName,
                                    date: claim.details.date,
                                    claimId: claim.id,
                                    lastName: otherPassenger.lastName,
                                    flightNumber: claim.details.flightNumber,
                                    parentLastName:
                                        otherPassenger.parentLastName!,
                                    parentFirstName:
                                        otherPassenger.parentFirstName!,
                                    minorBirthday: otherPassenger.birthday!,
                                },
                                assignment.path,
                            );
                        }

                        await this.documentDbService.remove(assignment.id);

                        await this.documentDbService.saveMany(
                            [
                                {
                                    name: generateAssignmentName(
                                        passenger.firstName,
                                        passenger.lastName,
                                    ),
                                    path: filepath,
                                    passengerId: assignment.passengerId,
                                    documentType: assignment.type,
                                },
                            ],
                            claim.id,
                        );
                    } catch (_e) {}
                }
            } catch (_e) {}
        }
    }

    async updateParentalAssignment(
        sourcePath: string,
        assignmentData: IParentalAssignmentData,
    ): Promise<string> {
        const {
            claimId,
            address,
            airlineName,
            date,
            firstName,
            lastName,
            flightNumber,
            parentLastName,
            parentFirstName,
            minorBirthday,
        } = assignmentData;

        const filepath = await this.saveParentalSignaturePdf(null, {
            claimId,
            address,
            airlineName,
            date,
            firstName,
            lastName,
            flightNumber,
            parentLastName,
            parentFirstName,
            minorBirthday,
        });

        await this.insertParentalSignatureFromSource(
            sourcePath,
            filepath,
            filepath,
        );

        return filepath;
    }

    async updateAssignment(
        sourcePath: string,
        assignmentData: IAssignmentData,
        isOldAssignment: boolean,
    ): Promise<string> {
        const {
            claimId,
            address,
            airlineName,
            date,
            firstName,
            lastName,
            flightNumber,
        } = assignmentData;

        const filepath = await this.saveSignaturePdf(null, {
            claimId,
            address,
            airlineName,
            date,
            firstName,
            lastName,
            flightNumber,
        });

        await this.insertSignatureFromSource(
            sourcePath,
            filepath,
            filepath,
            isOldAssignment,
        );

        return filepath;
    }

    async saveParentalSignaturePdf(
        signatureDataUrl: string | null,
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
        signatureTemplatePath?: string,
        isOldAssignment: boolean = false,
    ) {
        const today = formatDate(new Date(), 'dd.mm.yyyy');

        const fontBoldBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Inter', 'bold.ttf'),
        );
        const fontRegularBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Inter', 'regular.ttf'),
        );
        const fontMediumBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Inter', 'medium.ttf'),
        );

        let pngBuffer;
        if (signatureDataUrl) {
            const base64 = signatureDataUrl.replace(
                /^data:image\/png;base64,/,
                '',
            );
            pngBuffer = Buffer.from(base64, 'base64');
        }

        const templatePath = path.join(
            AssignmentsDirectoryPath,
            'parental-assignment_agreement-template.pdf',
        );
        const templateBuffer = await fs.readFile(templatePath);

        const pdfDoc = await PDFDocument.load(templateBuffer);

        // @ts-ignore
        pdfDoc.registerFontkit(fontkit);

        const fontBold = await pdfDoc.embedFont(fontBoldBuffer);
        const fontRegular = await pdfDoc.embedFont(fontRegularBuffer);
        const fontMedium = await pdfDoc.embedFont(fontMediumBuffer);

        const firstPage = pdfDoc.getPages()[0];
        const fourthPage = pdfDoc.getPages()[3];

        let pngImage;
        if (signatureDataUrl && pngBuffer) {
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
            y: 453,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.airlineName, {
            x: 130,
            y: 422,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.flightNumber, {
            x: 370,
            y: 453,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(formatDate(documentData.date, 'dd.mm.yyyy'), {
            x: 370,
            y: 422,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        fourthPage.drawText(
            `${documentData.parentFirstName} ${documentData.parentLastName}`,
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

        const pdfBytes = await pdfDoc.save();

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}.pdf`;
        const filePath = path.join(UPLOAD_DIRECTORY_PATH, fileName);

        await fs.writeFile(filePath, pdfBytes);

        if (signatureTemplatePath) {
            await this.insertParentalSignatureFromSource(
                signatureTemplatePath,
                filePath,
                filePath,
                isOldAssignment,
                {
                    width: 160,
                    height: 70,
                    x: 110,
                    y: 445,
                    page: 3,
                },
            );
        }

        return filePath;
    }

    async saveSignaturePdf(
        signatureDataUrl: string | null,
        documentData: {
            claimId: string;
            firstName: string;
            lastName: string;
            address: string;
            date: Date;
            flightNumber: string;
            airlineName: string;
        },
        signatureTemplatePath?: string,
    ) {
        const today = formatDate(new Date(), 'dd.MMMM.yyyy');

        const fontBoldBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Inter', 'bold.ttf'),
        );
        const fontRegularBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Inter', 'regular.ttf'),
        );
        const fontMediumBuffer = await fs.readFile(
            path.resolve(FontsDirectoryPath, 'Inter', 'medium.ttf'),
        );

        let pngBuffer;
        if (signatureDataUrl) {
            const base64 = signatureDataUrl.replace(
                /^data:image\/png;base64,/,
                '',
            );
            pngBuffer = Buffer.from(base64, 'base64');
        }

        const sourceBuffer = await fs.readFile(
            path.join(
                AssignmentsDirectoryPath,
                'assignment_agreement-template.pdf',
            ),
        );

        const pdfDoc = await PDFDocument.load(sourceBuffer);

        // @ts-ignore
        pdfDoc.registerFontkit(fontkit);

        const fontBold = await pdfDoc.embedFont(fontBoldBuffer);
        const fontRegular = await pdfDoc.embedFont(fontRegularBuffer);
        const fontMedium = await pdfDoc.embedFont(fontMediumBuffer);

        const firstPage = pdfDoc.getPages()[0];
        const thirdPage = pdfDoc.getPages()[2];

        let pngImage;
        if (signatureDataUrl && pngBuffer) {
            pngImage = await pdfDoc.embedPng(pngBuffer);
        }

        firstPage.drawText(today, {
            x: 253,
            y: 685,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(documentData.address, {
            x: 55,
            y: 605,
            size: 10.5,
            color: rgb(0.333, 0.333, 0.333),
            font: fontRegular,
        });

        firstPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
            {
                x: 55,
                y: 625,
                size: 10.5,
                color: rgb(0, 0, 0),
                font: fontBold,
            },
        );

        firstPage.drawText(documentData.claimId, {
            x: 130,
            y: 521,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.airlineName, {
            x: 130,
            y: 490,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(documentData.flightNumber, {
            x: 370,
            y: 521,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        firstPage.drawText(formatDate(documentData.date, 'dd.mm.yyyy'), {
            x: 370,
            y: 490,
            size: 10.5,
            color: rgb(0, 0, 0),
            font: fontRegular,
        });

        thirdPage.drawText(
            `${documentData.firstName} ${documentData.lastName}`,
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

        const pdfBytes = await pdfDoc.save();

        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        const fileName = `${uniqueSuffix}.pdf`;
        const filePath = path.join(UPLOAD_DIRECTORY_PATH, fileName);

        await fs.writeFile(filePath, pdfBytes);

        if (signatureTemplatePath) {
            await this.insertSignatureFromSource(
                signatureTemplatePath,
                filePath,
                filePath,
                false,
                {
                    width: 160,
                    height: 70,
                    x: 105,
                    y: 157,
                    page: 2,
                },
            );
        }

        return filePath;
    }
}
