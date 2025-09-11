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

    generateJWT<T extends JwtPayload>(
        payload: T,
        options?: SignOptions,
    ): string {
        return jwt.sign(
            {
                ...payload,
                jti: crypto.randomUUID(),
            },
            this.JWT_SECRET,
            options,
        );
    }

    async verifyJWT<T extends JwtPayload>(JWT: string): Promise<T> {
        const token = jwt.verify(JWT, this.JWT_SECRET) as T;

        await this.verifyIsRevoked(token);

        return token;
    }

    async revokeJwt(token: JwtPayload) {
        const now = Math.floor(Date.now() / 1000);

        const expireIn = token?.exp || token.iat; // compatability on each version and OS

        if (!token?.jti || !expireIn) {
            console.warn(
                "Token doesn't have jti or exp, while saving a token as revoked",
                token,
            );
            return;
        }
        const ttl = expireIn - now;

        if (ttl > 0) {
            await this.redis.set(`revoked:${token.jti}`, '1', 'EX', ttl);
        }

        return token;
    }

    private async verifyIsRevoked(token: JwtPayload) {
        const expireIn = token?.exp || token.iat; // compatability on each version and OS

        if (!token?.jti || !expireIn) {
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
