import { Injectable } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';
import { JwtPayload, SignOptions } from 'jsonwebtoken';

@Injectable()
export class TokenService {
    private readonly JWT_SECRET: string;

    constructor(private readonly config: ConfigService) {
        this.JWT_SECRET = this.config.getOrThrow<string>('JWT_SECRET');
    }

    generateJWT<T extends JwtPayload | string>(
        payload: T,
        options?: SignOptions,
    ): string {
        return jwt.sign(payload, this.JWT_SECRET, options);
    }

    verifyJWT<T extends JwtPayload | string>(JWT: string): T {
        return jwt.verify(JWT, this.JWT_SECRET) as T;
    }
}
