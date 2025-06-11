import { IoAdapter } from '@nestjs/platform-socket.io';
import { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ServerOptions } from 'socket.io';

export class SocketIoAdapter extends IoAdapter {
    constructor(
        private app: INestApplication,
        private configService: ConfigService,
    ) {
        super(app);
    }

    createIOServer(port: number, options: ServerOptions): any {
        const corsOrigin =
            this.configService.getOrThrow<string>('FRONTEND_URL');
        const opts: ServerOptions = {
            ...options,
            cors: {
                origin: corsOrigin,
                credentials: true,
            },
        };
        return super.createIOServer(port, opts);
    }
}
