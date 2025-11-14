import {
    BadRequestException,
    Controller,
    Get,
    NotFoundException,
    Query,
} from '@nestjs/common';
import { UrlShortenerService } from './url-shortener.service';
import { SHORTEN_URL_NOT_FOUND } from './constants';
import { isOtherPassengerLinkJwt } from '../utils/isOtherPassengerLinkJwt';
import { TokenService } from '../../token/token.service';
import { OtherPassengerCopiedLinksService } from '../../claim/other-passenger/other-passenger-copied-links/other-passenger-copied-links.service';

@Controller('links/url-shortener')
export class UrlShortenerController {
    constructor(
        private readonly urlShortenerService: UrlShortenerService,
        private readonly tokenService: TokenService,
        private readonly otherPassengerCopiedLinksService: OtherPassengerCopiedLinksService,
    ) {}

    @Get()
    async getShortenLink(@Query('shortenUrl') shortenUrl: string) {
        const originalUrl =
            await this.urlShortenerService.getOriginalUrl(shortenUrl);

        if (!originalUrl) {
            throw new NotFoundException(SHORTEN_URL_NOT_FOUND);
        }

        const searchParams = new URLSearchParams(originalUrl.split('?')[1]);
        const jwt = searchParams.get('claim') || searchParams.get('token');

        if (!jwt) {
            throw new BadRequestException(
                'Invalid link, please create new one',
            );
        }

        let isValid: boolean;
        try {
            const jwtPayload = await this.tokenService.verifyJWT(jwt);

            if (isOtherPassengerLinkJwt(jwtPayload)) {
                await this.otherPassengerCopiedLinksService.markAsOpened(
                    jwtPayload.otherPassengerId,
                    jwtPayload.otherPassengerCopiedLinkType,
                );
            }
            isValid = true;
        } catch (e) {
            isValid = false;
        }

        return { isValid, originalUrl };
    }
}
