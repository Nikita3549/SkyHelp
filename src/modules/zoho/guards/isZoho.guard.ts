import {
    CanActivate,
    ExecutionContext,
    ForbiddenException,
    Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { createHmac } from 'crypto';

@Injectable()
export class IsZohoGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>();
        const signatureHeader = req.headers['x-zs-webhook-signature'];
        // console.log('process guard: ', JSON.parse(req.body.toString()));

        if (typeof signatureHeader != 'string') {
            console.log('forbidden', JSON.parse(req.body.toString()));
            throw new ForbiddenException();
        }

        const rawBody: Buffer = req.body;

        if (!Buffer.isBuffer(req.body)) {
            throw new Error(
                'Expected req.body to be Buffer, but got: ' + typeof req.body,
            );
        }

        const secret = this.configService.getOrThrow<string>(
            'ZOHO_WEBHOOK_SECRET',
        );

        const computedSignature = createHmac('sha256', secret)
            .update(rawBody)
            .digest('base64');

        if (computedSignature !== signatureHeader) {
            throw new ForbiddenException();
        }

        return true;
    }
}
