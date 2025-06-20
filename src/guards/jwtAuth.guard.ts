import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthRequest } from '../interfaces/AuthRequest.interface';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const can = await super.canActivate(ctx);
        if (!can) return false;

        const request = ctx.switchToHttp().getRequest<AuthRequest>();
        const user = request.user;

        if (typeof user.id != 'string') {
            return false;
        }

        return true;
    }
}
