import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Request } from 'express';
import { IJwtPayload } from '../interfaces/jwtPayload';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private readonly config: ConfigService) {
        super({
            jwtFromRequest: ExtractJwt.fromExtractors([
                (req: Request) => {
                    // New variant httpOnly cookie
                    // if (req?.cookies?.accessToken) {
                    //     return req.cookies.accessToken;
                    // }

                    // Deprecated - Bearer
                    const auth = req?.headers?.authorization;
                    if (auth?.startsWith('Bearer ')) {
                        return auth.slice(7);
                    }

                    return null;
                },
            ]),
            secretOrKey: config.getOrThrow<string>('JWT_SECRET'),
        });
    }

    async validate(jwtPayload: IJwtPayload) {
        return jwtPayload;
    }
}
