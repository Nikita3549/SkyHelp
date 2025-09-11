import {
    Body,
    Controller,
    HttpCode,
    Post,
    UnauthorizedException,
} from '@nestjs/common';
import { UnsubscribeEmailDto } from './dto/unsubscribe-email.dto';
import { UnsubscribeEmailService } from './unsubscribe-email.service';
import { TokenService } from '../token/token.service';
import { UnsubscribeJwt } from './interfaces/unsubscribe-jwt';
import { INVALID_JWT } from '../claim/constants';
import { HttpStatusCode } from 'axios';

@Controller('unsubscribes')
export class UnsubscribeEmailController {
    constructor(
        private readonly unsubscribeEmailService: UnsubscribeEmailService,
        private readonly tokenService: TokenService,
    ) {}

    @Post()
    @HttpCode(HttpStatusCode.NoContent)
    async unsubscribeEmail(@Body() dto: UnsubscribeEmailDto) {
        const { email, jwt } = dto;

        const jwtPayload = await this.tokenService.verifyJWT(jwt);

        if (!this.isUnsubscribeJwt(jwtPayload) || jwtPayload.email != email) {
            throw new UnauthorizedException(INVALID_JWT);
        }

        if (await this.unsubscribeEmailService.getUnsubscribeEmail(email)) {
            return;
        }

        this.unsubscribeEmailService.createUnsubscribeEmail(email);
    }

    private isUnsubscribeJwt(jwt: unknown): jwt is UnsubscribeJwt {
        return (
            typeof jwt == 'object' &&
            jwt != null &&
            'email' in jwt &&
            typeof (jwt as any).email == 'string'
        );
    }
}
