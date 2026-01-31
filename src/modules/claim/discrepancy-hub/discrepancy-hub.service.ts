import { Injectable } from '@nestjs/common';
import axios from 'axios';
import { ConfigService } from '@nestjs/config';
import { IExtractPassportResponse } from './interfaces/extract-passport-response.interface';
import {
    ClaimDiscrepancy,
    ClaimDiscrepancyFieldName,
    Document,
    DocumentType,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class DiscrepancyHubService {
    constructor(
        private readonly configService: ConfigService,
        private readonly prisma: PrismaService,
    ) {}

    async processPassportDiscrepancy(
        documents: (Document & { buffer: Buffer })[],
        claimId: string,
    ) {
        await Promise.all(
            documents.map(async (doc) => {
                if (doc.type != DocumentType.PASSPORT) {
                    return;
                }
                const passportData = await this.extractPassportData(doc.buffer);

                if (passportData?.firstName) {
                    await this.saveDiscrepancy({
                        fieldName: ClaimDiscrepancyFieldName.FIRST_NAME,
                        documentId: doc.id,
                        passengerId: doc.passengerId,
                        claimId: claimId,
                        extractedValue: passportData.firstName,
                    });
                }
                if (passportData?.lastName) {
                    await this.saveDiscrepancy({
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

    private async saveDiscrepancy(data: {
        fieldName: ClaimDiscrepancyFieldName;
        passengerId: string;
        documentId: string;
        extractedValue: string;
        claimId: string;
    }): Promise<ClaimDiscrepancy> {
        return this.prisma.claimDiscrepancy.create({
            data: {
                fieldName: data.fieldName,
                passengerId: data.passengerId,
                documentId: data.documentId,
                extractedValue: data.extractedValue,
                claimId: data.claimId,
            },
        });
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
