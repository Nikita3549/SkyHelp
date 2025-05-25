import { Injectable } from '@nestjs/common';
import { IJwtPayload } from './interfaces/jwtPayload';
import * as jwt from 'jsonwebtoken';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class TokenService {
    private readonly JWT_SECRET: string;

    constructor(private readonly config: ConfigService) {
        this.JWT_SECRET = this.config.getOrThrow<string>('JWT_SECRET');
    }

    generateJWT(payload: IJwtPayload): string {
        return jwt.sign(payload, this.JWT_SECRET);
    }

    verifyJWT(JWT: string): IJwtPayload {
        return jwt.verify(JWT, this.JWT_SECRET) as IJwtPayload;
    }
}
