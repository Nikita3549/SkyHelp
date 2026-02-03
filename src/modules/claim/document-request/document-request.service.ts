import { Injectable } from '@nestjs/common';
import { CreateDocumentRequestDto } from './dto/create-document-request.dto';
import { PrismaService } from '../../prisma/prisma.service';
import {
    DocumentRequest,
    DocumentRequestStatus,
    DocumentRequestType,
    DocumentType,
} from '@prisma/client';
import { InjectQueue } from '@nestjs/bullmq';
import { SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY } from './constants';
import { Queue } from 'bullmq';
import { SendNewDocumentRequestJobDataInterface } from './interfaces/send-new-document-request-job-data.interface';
import { Languages } from '../../language/enums/languages.enums';
import { DAY, MINUTE } from '../../../common/constants/time.constants';
import { getNextWorkTime } from '../../../common/utils/getNextWorkTime';
import { IFullClaim } from '../../claim-persistence/types/claim-persistence.types';
import { RedisService } from '../../redis/redis.service';

@Injectable()
export class DocumentRequestService {
    constructor(
        private readonly prisma: PrismaService,
        @InjectQueue(SEND_NEW_DOCUMENT_REQUEST_QUEUE_KEY)
        private readonly sendNewDocumentRequestQueue: Queue,
        private readonly redis: RedisService,
    ) {}

    async create(
        data: CreateDocumentRequestDto,
        claim: IFullClaim,
    ): Promise<DocumentRequest> {
        const docRequest = this.prisma.documentRequest.create({
            data: {
                ...data,
                isSent: false,
                documentType: this.getDocumentTypeByRequestType(data.type),
            },
        });

        const isLocked = await this.redis.get(
            `claim:${claim.id}:docs_request_email_lock`,
        );

        if (!isLocked) {
            await this.scheduleSendNewDocumentRequests(claim);

            await this.redis.set(
                `claim:${claim.id}:docs_request_email_lock`,
                1,
                'PX',
                DAY * 12,
            );
        }

        return docRequest;
    }

    private getDocumentTypeByRequestType(
        requestType: DocumentRequestType,
    ): DocumentType {
        switch (requestType) {
            case DocumentRequestType.ASSIGNMENT:
                return DocumentType.ASSIGNMENT;

            case DocumentRequestType.PASSPORT:
                return DocumentType.PASSPORT;

            case DocumentRequestType.ETICKET:
                return DocumentType.DOCUMENT;

            case DocumentRequestType.BOARDING_PASS:
                return DocumentType.DOCUMENT;
        }
    }

    async getByClaimId(claimId: string): Promise<DocumentRequest[]> {
        return this.prisma.documentRequest.findMany({
            where: {
                claimId,
            },
        });
    }

    async getActiveByClaimId(claimId: string): Promise<DocumentRequest[]> {
        return this.prisma.documentRequest.findMany({
            where: {
                claimId,
                status: DocumentRequestStatus.ACTIVE,
            },
        });
    }

    async updateStatus(
        documentRequestId: string,
        status: DocumentRequestStatus,
    ) {
        return this.prisma.documentRequest.update({
            data: {
                status,
            },
            where: {
                id: documentRequestId,
            },
        });
    }

    async getById(documentRequestId: string): Promise<DocumentRequest | null> {
        return this.prisma.documentRequest.findFirst({
            where: {
                id: documentRequestId,
            },
        });
    }

    async delete(documentRequestId: string) {
        return this.prisma.documentRequest.delete({
            where: {
                id: documentRequestId,
            },
        });
    }

    async scheduleSendNewDocumentRequests(claim: IFullClaim) {
        const delays = [
            MINUTE * 0,
            DAY * 2,
            DAY * 4,
            DAY * 6,
            DAY * 8,
            DAY * 10,
            DAY * 12,
        ];

        const jobData: SendNewDocumentRequestJobDataInterface = {
            claimId: claim.id,
            customerName: claim.customer.firstName,
            to: claim.customer.email,
            language: (claim.customer.language as Languages) || Languages.EN,
        };

        for (const delay of delays) {
            await this.sendNewDocumentRequestQueue.add(
                'sendNewDocumentRequestEmail',
                jobData,
                {
                    delay: getNextWorkTime(delay),
                    attempts: 1,
                },
            );
        }
    }
}
