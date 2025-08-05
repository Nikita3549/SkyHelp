import { Observable, of } from 'rxjs';
import {
    BadRequestException,
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { Request, Response } from 'express';
import { ONE_DAY } from '../constants';

@Injectable()
export class IdempotencyInterceptor implements NestInterceptor {
    constructor(private readonly redis: RedisService) {}

    async intercept(
        context: ExecutionContext,
        next: CallHandler,
    ): Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest<Request>();
        const res = context.switchToHttp().getResponse<Response>();

        const rawBody = req.body;
        if (!Buffer.isBuffer(rawBody)) {
            console.log('not buffer', req.body);
            throw new BadRequestException('Expected raw Buffer body');
        }

        let parsedBody: any;
        try {
            parsedBody = JSON.parse(rawBody.toString());
        } catch {
            console.log('invalid json', parsedBody);
            throw new BadRequestException('Invalid JSON body');
        }

        const requestId = parsedBody?.requests?.request_id;
        const requestStatus = parsedBody?.requests?.request_status;

        if (typeof requestId != 'string') {
            console.log('Missing request_id', parsedBody);
            throw new BadRequestException('Missing request_id');
        }

        const key = `webhook:${requestId}`;
        const exists = await this.redis.get(key);

        if (exists || requestStatus != 'completed') {
            res.status(204).send();
            return of({});
        }

        await this.redis.set(key, '1', 'EX', ONE_DAY);

        return next.handle();
    }
}
