import { Socket } from 'socket.io';

export interface AuthSocket extends Omit<Socket, 'data'> {
    data: {
        userId: string;
    };
}
