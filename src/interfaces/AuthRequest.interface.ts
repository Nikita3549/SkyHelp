import { IJwtPayload } from '../modules/token/interfaces/jwtPayload';

export interface AuthRequest extends Request {
    user: IJwtPayload;
}
