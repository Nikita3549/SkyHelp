import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class GenerateLinksService {
    private readonly FRONTEND_URL: string;

    constructor(private readonly configService: ConfigService) {
        this.FRONTEND_URL = this.configService.getOrThrow('FRONTEND_URL');
    }

    generateScanLink(sessionId: string) {
        return `${this.FRONTEND_URL}/scan?sessionId=${sessionId}`;
    }

    async generateUploadPassport(
        customerId: string,
        claimId: string,
        jwt: string,
    ) {
        return `${this.FRONTEND_URL}/passport/customer?customerId=${encodeURIComponent(customerId)}&claimId=${encodeURIComponent(claimId)}&claim=${encodeURIComponent(jwt)}`;
    }

    async generateUploadDocuments(
        customerId: string,
        claimId: string,
        jwt: string,
    ) {
        return `${this.FRONTEND_URL}/documents/customer?customerId=${encodeURIComponent(customerId)}&claimId=${encodeURIComponent(claimId)}&claim=${encodeURIComponent(jwt)}`;
    }

    async generateSignCustomer(
        customerId: string,
        claimId: string,
        jwt: string,
    ) {
        return `${this.FRONTEND_URL}/sign/customer?customerId=${encodeURIComponent(customerId)}&claimId=${encodeURIComponent(claimId)}&claim=${encodeURIComponent(jwt)}`;
    }

    async generateSignOtherPassenger(
        passengerId: string,
        jwt: string,
        requireParentInfo: boolean,
    ) {
        return `${this.FRONTEND_URL}/sign?passengerId=${encodeURIComponent(passengerId)}&claim=${encodeURIComponent(jwt)}${requireParentInfo ? `&requireParentInfo=yes` : ''}`;
    }
}
