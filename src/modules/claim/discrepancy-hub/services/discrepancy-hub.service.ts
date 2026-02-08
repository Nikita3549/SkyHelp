import { forwardRef, Inject, Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IExtractPassportResponse } from '../interfaces/extract-passport-response.interface';
import {
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

                const assignmentExtractedData =
                    await this.extractSignatureMatchScore({
                        passport: passport.buffer,
                        signature: assignment.buffer,
                    });

                if (assignmentExtractedData?.matchScore) {
                    await this.discrepancyPersistenceService.saveDiscrepancy({
                        documentId: assignment.id,
                        passengerId: assignment.passengerId,
                        claimId: claimId,
                        extractedValue: assignmentExtractedData.matchScore,
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
                    passportData.firstName != passenger.firstName
                ) {
                    await this.discrepancyPersistenceService.saveDiscrepancy({
                        fieldName: ClaimDiscrepancyFieldName.FIRST_NAME,
                        documentId: doc.id,
                        passengerId: doc.passengerId,
                        claimId: claimId,
                        extractedValue: passportData.firstName,
                        type: DiscrepancyType.PASSENGER,
                    });
                }
                if (
                    passportData?.lastName &&
                    passportData.lastName != passenger.lastName
                ) {
                    await this.discrepancyPersistenceService.saveDiscrepancy({
                        fieldName: ClaimDiscrepancyFieldName.LAST_NAME,
                        documentId: doc.id,
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
    }): Promise<{ matchScore?: string }> {
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

            return {
                matchScore: data?.match_score?.toString(),
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
