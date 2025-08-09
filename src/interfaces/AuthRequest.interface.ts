import { IJwtPayload } from '../modules/token/interfaces/jwtPayload';
import { Request } from 'express';

export interface AuthRequest extends Request {
    user: IJwtPayload;
}
