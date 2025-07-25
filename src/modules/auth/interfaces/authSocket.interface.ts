import { Socket } from 'socket.io';
import { IJwtPayload } from '../../token/interfaces/jwtPayload';

export interface AuthSocket extends Omit<Socket, 'data'> {
    data: IJwtPayload;
}
