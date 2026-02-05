import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IExtractPassportResponse } from '../interfaces/extract-passport-response.interface';
import {
    ClaimDiscrepancyFieldName,
    Document,
    DocumentType,
} from '@prisma/client';
import { ClaimPersistenceService } from '../../../claim-persistence/services/claim-persistence.service';
import { DiscrepancyPersistenceService } from './discrepancy-persistence.service';

@Injectable()
export class DiscrepancyHubService {
    constructor(
        private readonly configService: ConfigService,
        private readonly discrepancyPersistenceService: DiscrepancyPersistenceService,
        private readonly claimPersistenceService: ClaimPersistenceService,
    ) {}

    async processPassportDiscrepancy(
        documents: (Document & { buffer: Buffer })[],
        claimId: string,
    ) {
        await Promise.all(
            documents.map(async (doc) => {
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
                    });
                }
            }),
        );
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
