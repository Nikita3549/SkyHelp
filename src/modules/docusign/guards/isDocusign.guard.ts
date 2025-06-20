import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    HttpStatus,
    Injectable,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class IsDocusignGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>();
        const signatureHeader = req.headers['x-docusign-signature-1'];

        if (typeof signatureHeader != 'string') {
            console.log('forbidden', req);
            throw new ForbiddenException();
        }

        const rawBody: Buffer = req.body;

        if (!Buffer.isBuffer(req.body)) {
            throw new Error(
                'Expected req.body to be Buffer, but got: ' + typeof req.body,
            );
        }

        const secret = this.configService.getOrThrow<string>(
            'DOCUSIGN_WEBHOOK_SECRET',
        );

        const computedSignature = createHmac('sha256', secret)
            .update(rawBody)
            .digest('base64');

        if (computedSignature !== signatureHeader) {
            console.log('forbidden', req);
            throw new ForbiddenException();
        }

        return true;
    }
}
