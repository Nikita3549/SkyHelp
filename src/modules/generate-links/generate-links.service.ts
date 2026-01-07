import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateNumericId } from '../../common/utils/generateNumericId';
import { UrlShortenerService } from './url-shortener/url-shortener.service';
import { OtherPassengerCopiedLinkType } from '@prisma/client';
import { CONTINUE_LINKS_EXP } from '../claim/constants';
import { TokenService } from '../token/token.service';
import { AuthService } from '../auth/auth.service';
import { UserService } from '../user/user.service';

@Injectable()
export class GenerateLinksService {
    private readonly FRONTEND_URL: string;

    constructor(
        private readonly configService: ConfigService,
        private readonly urlShortenerService: UrlShortenerService,
        private readonly tokenService: TokenService,
        private readonly authService: AuthService,
        private readonly userService: UserService,
    ) {
        this.FRONTEND_URL = this.configService.getOrThrow('FRONTEND_URL');
    }

    scanLink(sessionId: string) {
        return `${this.FRONTEND_URL}/scan?sessionId=${sessionId}`;
    }

    async continueJwtLink(
        claimId: string,
        otherPassengerData?: {
            id: string;
            copiedLinkType: OtherPassengerCopiedLinkType;
        },
    ) {
        return this.tokenService.generateJWT(
            {
                claimId,
                otherPassengerId: otherPassengerData?.id,
                otherPassengerCopiedLinkType:
                    otherPassengerData?.copiedLinkType,
            },
            { expiresIn: CONTINUE_LINKS_EXP },
        );
    }

    async uploadDocuments(
        passengerId: string,
        claimId: string,
        jwt: string,
        documentTypes: string,
        passengerName?: string,
    ) {
        const url = `/documents/customer?customerId=${encodeURIComponent(passengerId)}&claimId=${encodeURIComponent(claimId)}&claim=${encodeURIComponent(jwt)}&documentType=${documentTypes}&passengerName=${passengerName}`;

        const shortenUrl = await this.urlShortenerService.saveShortenUrl(
            url,
            `/documents/customer/?id=${generateNumericId(10)}`,
        );

        const link = `${this.FRONTEND_URL}${shortenUrl}`;

        return link;
    }

    async signCustomer(customerId: string, claimId: string, jwt: string) {
        const url = `/sign/customer?customerId=${encodeURIComponent(customerId)}&claimId=${encodeURIComponent(claimId)}&claim=${encodeURIComponent(jwt)}`;

        const shortenUrl = await this.urlShortenerService.saveShortenUrl(
            url,
            `/sign/customer/?id=${generateNumericId(10)}`,
        );
        const link = `${this.FRONTEND_URL}${shortenUrl}`;

        return link;
    }

    async paymentDetails(jwt: string) {
        const url = `/payment-details?token=${encodeURIComponent(jwt)}`;

        const shortenUrl = await this.urlShortenerService.saveShortenUrl(
            url,
            `/payment-details?id=${generateNumericId(10)}`,
        );
        const link = `${this.FRONTEND_URL}${shortenUrl}`;

        return link;
    }

    async signOtherPassenger(
        passengerId: string,
        jwt: string,
        requireParentInfo: boolean,
        isMinor: boolean,
    ) {
        const url = `/sign?passengerId=${encodeURIComponent(passengerId)}&claim=${encodeURIComponent(jwt)}&isMinor=${isMinor ? 'yes' : 'no'}${requireParentInfo ? `&requireParentInfo=yes` : ''}`;

        const shortenUrl = await this.urlShortenerService.saveShortenUrl(
            url,
            `/sign/?id=${generateNumericId(10)}`,
        );
        const link = `${this.FRONTEND_URL}${shortenUrl}`;

        return link;
    }

    async authorizedDashboardLink(userId: string | null) {
        let baseLink = `${this.configService.getOrThrow('FRONTEND_URL')}/dashboard`;
        if (!userId) {
            return baseLink;
        }
        const user = await this.userService.getUserById(userId);

        if (!user) {
            return baseLink;
        }

        const { jwt: userJwt } = this.authService.generateUserJwt(user);

        return `${baseLink}?userJwt=${userJwt}`;
    }
}
