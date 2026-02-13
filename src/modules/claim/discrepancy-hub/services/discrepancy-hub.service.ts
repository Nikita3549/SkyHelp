import {
    forwardRef,
    Inject,
    Injectable,
    NotFoundException,
} from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IExtractPassportResponse } from '../interfaces/extract-passport-response.interface';
import {
    ClaimDiscrepancy,
    ClaimDiscrepancyFieldName,
    DiscrepancyType,
    Document,
    DocumentType,
} from '@prisma/client';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';
import { DiscrepancyPersistenceService } from './discrepancy-persistence.service';
import { DocumentService } from '../../document/services/document.service';
import { ExtractSignatureMatchResponse } from '../interfaces/extract-signature-match-response.interface';
import { S3Service } from '../../../s3/s3.service';
import { DISCREPANCY_NOT_FOUND } from '../constants';
import { CLAIM_NOT_FOUND } from '../../constants';

@Injectable()
export class DiscrepancyHubService {
    constructor(
        private readonly configService: ConfigService,
        private readonly discrepancyPersistenceService: DiscrepancyPersistenceService,
        private readonly claimPersistenceService: ClaimPersistenceService,
        @Inject(forwardRef(() => DocumentService))
        private readonly documentService: DocumentService,
        private readonly S3Service: S3Service,
    ) {}

    async refreshSignatureDiscrepancy(
        claimId: string,
        discrepancyId?: string,
    ): Promise<ClaimDiscrepancy> {
        const claim = await this.claimPersistenceService.findOneById(claimId);
        if (!claim) {
            throw new NotFoundException(CLAIM_NOT_FOUND);
        }

        const sortedDiscrepancies = claim.discrepancies.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );

        const discrepancy = discrepancyId
            ? await this.discrepancyPersistenceService.findOne(discrepancyId)
            : sortedDiscrepancies.find(
                  (dis) => dis.type == DiscrepancyType.SIGNATURE,
              );

        if (!discrepancy) {
            throw new NotFoundException(DISCREPANCY_NOT_FOUND);
        }

        if (discrepancy.type != DiscrepancyType.SIGNATURE) {
            return discrepancy;
        }

        const sortedDocuments = claim.documents.sort(
            (a, b) => b.createdAt.getTime() - a.createdAt.getTime(),
        );

        const passport = sortedDocuments.find(
            (doc) => doc.type == DocumentType.PASSPORT,
        );
        const assignment = sortedDocuments.find(
            (doc) => doc.type == DocumentType.ASSIGNMENT,
        );

        if (
            !passport ||
            !assignment ||
            !passport.signatureS3Key ||
            !assignment.signatureS3Key
        ) {
            return discrepancy;
        }

        const { matchScore, signaturePng } =
            await this.extractSignatureMatchScore({
                passport: await this.S3Service.getBuffer(
                    passport.signatureS3Key,
                ),
                signature: await this.S3Service.getBuffer(
                    assignment.signatureS3Key,
                ),
            });

        if (matchScore && signaturePng) {
            await this.documentService.saveDocumentSignature({
                png: signaturePng,
                document: passport,
            });

            return this.discrepancyPersistenceService.saveDiscrepancy({
                claimId: discrepancy.claimId,
                extractedValue: matchScore,
                passengerId: discrepancy.passengerId,
                documentIds: [passport.id, assignment.id],
                type: DiscrepancyType.SIGNATURE,
            });
        }

        return discrepancy;
    }

    async processAssignmentDiscrepancy(
        assignments: (Document & { buffer: Buffer })[],
        claimId: string,
    ) {
        const passports = await this.documentService.getDocumentsByClaimId(
            claimId,
            { documentType: DocumentType.PASSPORT },
        );

        const passportsWithBuffer = await Promise.all(
            passports.map(async (doc) => ({
                ...doc,
                buffer: await this.S3Service.getBuffer(doc.s3Key),
            })),
        );

        await Promise.all(
            assignments.map(async (assignment) => {
                const passenger =
                    await this.claimPersistenceService.getBasePassenger(
                        assignment.passengerId,
                    );

                const passport = passportsWithBuffer.find(
                    (passport) =>
                        passport.passengerId == assignment.passengerId &&
                        !passport.deletedAt,
                );

                if (
                    assignment.type != DocumentType.ASSIGNMENT ||
                    !passenger ||
                    !passport
                ) {
                    return;
                }

                const assignmentSignaturePdf =
                    await this.documentService.extractSignature(
                        assignment.buffer,
                        passenger.isMinor,
                    );

                const { matchScore, signaturePng: passportSignaturePng } =
                    await this.extractSignatureMatchScore({
                        passport: passport.buffer,
                        signature: assignmentSignaturePdf,
                    });

                if (passportSignaturePng) {
                    // Save passport signature
                    await this.documentService.saveDocumentSignature({
                        png: passportSignaturePng,
                        document: passport,
                    });
                }
                // Save assignment signature
                const assignmentSignaturePng = (
                    await this.documentService.pdfToPng(assignmentSignaturePdf)
                )[0];
                await this.documentService.saveDocumentSignature({
                    png: assignmentSignaturePng,
                    document: assignment,
                });

                if (matchScore) {
                    await this.discrepancyPersistenceService.saveDiscrepancy({
                        documentIds: [assignment.id, passport.id],
                        passengerId: assignment.passengerId,
                        claimId: claimId,
                        extractedValue: matchScore,
                        type: DiscrepancyType.SIGNATURE,
                    });
                }
            }),
        );
    }

    async processPassportDiscrepancy(
        passports: (Document & { buffer: Buffer })[],
        claimId: string,
    ) {
        await Promise.all(
            passports.map(async (doc) => {
                const passenger =
                    await this.claimPersistenceService.getBasePassenger(
                        doc.passengerId,
                    );

                if (doc.type != DocumentType.PASSPORT || !passenger) {
                    return;
                }

                const passportData = await this.extractPassportData(doc.buffer);

                if (
                    passportData?.firstName &&
                    passportData.firstName.toLowerCase() !=
                        passenger.firstName.toLowerCase()
                ) {
                    await this.discrepancyPersistenceService.saveDiscrepancy({
                        fieldName: ClaimDiscrepancyFieldName.FIRST_NAME,
                        documentIds: [doc.id],
                        passengerId: doc.passengerId,
                        claimId: claimId,
                        extractedValue: passportData.firstName,
                        type: DiscrepancyType.PASSENGER,
                    });
                }
                if (
                    passportData?.lastName &&
                    passportData.lastName.toLowerCase() !=
                        passenger.lastName.toLowerCase()
                ) {
                    await this.discrepancyPersistenceService.saveDiscrepancy({
                        fieldName: ClaimDiscrepancyFieldName.LAST_NAME,
                        documentIds: [doc.id],
                        passengerId: doc.passengerId,
                        claimId: claimId,
                        extractedValue: passportData.lastName,
                        type: DiscrepancyType.PASSENGER,
                    });
                }
            }),
        );
    }

    private async extractSignatureMatchScore(files: {
        signature: Buffer;
        passport: Buffer;
    }): Promise<{ matchScore?: string; signaturePng?: Buffer }> {
        try {
            const url = `${this.configService.getOrThrow('EXTRACT_DOCUMENT_DATA_API_URL')}/verify-signature`;
            const formData = new FormData();

            const passport = new Blob([new Uint8Array(files.passport)]);
            formData.append('passport', passport);
            const signature = new Blob([new Uint8Array(files.signature)]);
            formData.append('signature', signature);

            const { data } = await axios.post<ExtractSignatureMatchResponse>(
                url,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                },
            );

            if (
                !data.cropped_signatures_base64 ||
                !data.cropped_signatures_base64[0] ||
                !data.cropped_signatures_base64[0].includes(',')
            ) {
                return {
                    matchScore: data?.match_score?.toString(),
                };
            }

            const base64Data = data.cropped_signatures_base64[0]
                .split(',')[1]
                .trim();
            const signaturePng = Buffer.from(base64Data, 'base64');

            return {
                matchScore: data?.match_score?.toString(),
                signaturePng,
            };
        } catch (e) {
            console.error('Extract signature mismatch data error: ', e);
            return {};
        }
    }

    private async extractPassportData(passportBuffer: Buffer): Promise<{
        firstName?: string;
        lastName?: string;
    }> {
        try {
            const url = `${this.configService.getOrThrow('EXTRACT_DOCUMENT_DATA_API_URL')}/extract-passport`;
            const formData = new FormData();

            const blob = new Blob([new Uint8Array(passportBuffer)]);
            formData.append('passport', blob);

            const { data } = await axios.post<IExtractPassportResponse>(
                url,
                formData,
                {
                    headers: {
                        'Content-Type': 'multipart/form-data',
                    },
                },
            );

            return {
                firstName: data?.extracted_data?.given_names,
                lastName: data?.extracted_data?.surname,
            };
        } catch (e) {
            console.error('Extract passport data error: ', e);
            return {};
        }
    }
}
