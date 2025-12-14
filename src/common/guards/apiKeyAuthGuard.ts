import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    UnauthorizedException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { Request } from 'express';
import * as process from 'process';

export class ApiKeyAuthGuard implements CanActivate {
    canActivate(
        ctx: ExecutionContext,
    ): boolean | Promise<boolean> | Observable<boolean> {
        const host = ctx.switchToHttp();
        const req = host.getRequest<Request>();

        const apiKey = req.headers['x-api-key'];

        if (!apiKey || typeof apiKey != 'string') {
            throw new UnauthorizedException('Missing apiKey');
        }
        if (apiKey != process.env['API_KEY']) {
            throw new ForbiddenException('Invalid apiKey');
        }
        return true;
    }
}
