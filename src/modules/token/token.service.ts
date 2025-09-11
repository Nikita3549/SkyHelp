import {
    Injectable,
    InternalServerErrorException,
    UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, SignOptions } from 'jsonwebtoken';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class TokenService {
    private readonly JWT_SECRET: string;

    constructor(
        private readonly config: ConfigService,
        private readonly redis: RedisService,
    ) {
        this.JWT_SECRET = this.config.getOrThrow<string>('JWT_SECRET');
    }

    generateJWT<T extends JwtPayload | string>(
        payload: T,
        options?: SignOptions,
    ): string {
        const jwtPayload: string | JwtPayload =
            typeof payload == 'string'
                ? payload
                : {
                      ...payload,
                      jti: crypto.randomUUID(),
                  };

        return jwt.sign(jwtPayload, this.JWT_SECRET, options);
    }

    async verifyJWT<T extends JwtPayload | string>(JWT: string): Promise<T> {
        const token = jwt.verify(JWT, this.JWT_SECRET) as T;

        if (typeof token != 'string') {
            await this.verifyIsRevoked(token);
        }

        return token;
    }

    async revokeJwt(token: JwtPayload) {
        const now = Math.floor(Date.now() / 1000);

        if (!token?.jti || !token?.exp) {
            console.warn(
                "Token doesn't have jti or exp, while saving a token as revoked",
                token,
            );
            return;
        }
        const ttl = token.exp - now;

        if (ttl > 0) {
            await this.redis.set(`revoked:${token.jti}`, '1', 'EX', ttl);
        }

        return token;
    }

    private async verifyIsRevoked(token: JwtPayload) {
        if (!token?.jti || !token?.exp) {
            console.warn(
                "Token doesn't have jti or exp while verifying is token revoked",
                token,
            );
            return;
        }
        const jti = token.jti;

        const isRevoked = await this.redis.get(`revoked:${jti}`);

        if (isRevoked) {
            throw new UnauthorizedException('Expired jwt token');
        }
    }
}
