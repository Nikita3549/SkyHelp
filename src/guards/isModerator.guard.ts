import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthRequest } from '../interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';

export class IsModeratorGuard implements CanActivate {
    canActivate(ctx: ExecutionContext): boolean {
        const host = ctx.switchToHttp();
        const req: AuthRequest = host.getRequest();

        return (
            req.user.role == UserRole.MODERATOR ||
            req.user.role == UserRole.ADMIN
        );
    }
}
