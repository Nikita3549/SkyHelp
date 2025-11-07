import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentType } from '@prisma/client';
import { generateNumericId } from '../../utils/generateNumericId';
import { UrlShortenerService } from './url-shortener/url-shortener.service';

@Injectable()
export class GenerateLinksService {
    private readonly FRONTEND_URL: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly urlShortenerService: UrlShortenerService,
    ) {
        this.FRONTEND_URL = this.configService.getOrThrow('FRONTEND_URL');
    }

    generateScanLink(sessionId: string) {
        return `${this.FRONTEND_URL}/scan?sessionId=${sessionId}`;
    }

    async generateUploadDocuments(
        customerId: string,
        claimId: string,
        jwt: string,
        documentTypes: string,
    ) {
        const url = `/documents/customer?customerId=${encodeURIComponent(customerId)}&claimId=${encodeURIComponent(claimId)}&claim=${encodeURIComponent(jwt)}&documentType=${documentTypes}`;

        const shortenUrl = await this.urlShortenerService.saveShortenUrl(
            url,
            `/documents/customer/?id=${generateNumericId(10)}`,
        );
        console.log(url);
        console.log(shortenUrl);

        const link = `${this.FRONTEND_URL}${shortenUrl}`;

        return link;
    }

    async generateSignCustomer(
        customerId: string,
        claimId: string,
        jwt: string,
    ) {
        const url = `/sign/customer?customerId=${encodeURIComponent(customerId)}&claimId=${encodeURIComponent(claimId)}&claim=${encodeURIComponent(jwt)}`;

        const shortenUrl = await this.urlShortenerService.saveShortenUrl(
            url,
            `/sign/customer/?id=${generateNumericId(10)}`,
        );
        const link = `${this.FRONTEND_URL}${shortenUrl}`;

        return link;
    }

    async generateSignOtherPassenger(
        passengerId: string,
        jwt: string,
        requireParentInfo: boolean,
    ) {
        const url = `/sign?passengerId=${encodeURIComponent(passengerId)}&claim=${encodeURIComponent(jwt)}${requireParentInfo ? `&requireParentInfo=yes` : ''}`;

        const shortenUrl = await this.urlShortenerService.saveShortenUrl(
            url,
            `/sign/?id=${generateNumericId(10)}`,
        );
        const link = `${this.FRONTEND_URL}${shortenUrl}`;

        return link;
    }
}
