import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { Request } from 'express';

export function isAuthRequest(req: Request | AuthRequest): req is AuthRequest {
    return 'user' in req && typeof (req as any).user?.id == 'string';
}
