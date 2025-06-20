import { AuthRequest } from '../../../interfaces/AuthRequest.interface';
import { Request } from 'express';

export function getAuthJwt(req: Request): string | null {
    const authHeader =
        req.headers['authorization'] || req.headers['Authorization'];
    if (!authHeader || typeof authHeader !== 'string') return null;

    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) return null;

    return token;
}
