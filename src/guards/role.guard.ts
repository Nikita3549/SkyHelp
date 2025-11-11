import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthRequest } from '../interfaces/AuthRequest.interface';
import { UserRole } from '@prisma/client';

export class RoleGuard implements CanActivate {
    constructor(private readonly roles: UserRole[]) {}

    canActivate(ctx: ExecutionContext): boolean {
        const host = ctx.switchToHttp();
        const req: AuthRequest = host.getRequest();

        return this.roles.includes(req.user.role);
    }
}
