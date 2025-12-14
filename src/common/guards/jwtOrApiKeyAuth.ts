import {
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from '../interfaces/AuthRequest.interface';
import * as process from 'process';

@Injectable()
export class JwtOrApiKeyAuth extends AuthGuard('jwt') {
    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const request = ctx.switchToHttp().getRequest<AuthRequest>();

        const apiKey = request.headers['x-api-key'];

        if (apiKey) {
            if (apiKey != process.env['API_KEY']) {
                throw new ForbiddenException('Invalid apiKey');
            }
            return true;
        }

        const can = await super.canActivate(ctx);
        if (!can) return false;

        const user = request.user;

        if (typeof user.id != 'string' || !user.isActive) {
            return false;
        }

        return true;
    }
}
