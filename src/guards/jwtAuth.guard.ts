import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from '../interfaces/AuthRequest.interface';
import { IJwtPayload } from '../modules/token/interfaces/jwtPayload';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const can = await super.canActivate(ctx);
        if (!can) return false;

        const http = ctx.switchToHttp();
        const req = http.getRequest<AuthRequest>();
        const res = http.getResponse();

        const user: Partial<IJwtPayload> = req.user;

        if (typeof user.id !== 'string' || !user.isActive) {
            return false;
        }

        // Temporary migration on http only token
        if (
            req.headers.authorization?.startsWith('Bearer ') &&
            !req.cookies?.accessToken
        ) {
            const token = req.headers.authorization.slice(7);

            res.cookie('accessToken', token, {
                httpOnly: true,
                secure: true,
                sameSite: 'lax',
                path: '/',
            });
        }

        return true;
    }
}
