import { ArgumentsHost, BadRequestException, Catch } from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { Socket } from 'socket.io';

@Catch(BadRequestException)
export class ValidationFilter extends BaseWsExceptionFilter {
    catch(exception: BadRequestException, host: ArgumentsHost) {
        const client: Socket = host.switchToWs().getClient();

        client.emit(
            'exception',
            `Bad Request: ${JSON.stringify(exception.getResponse())}`,
        );
    }
}
