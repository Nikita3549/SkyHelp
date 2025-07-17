import {
    ArgumentsHost,
    BadRequestException,
    Catch,
    HttpException,
} from '@nestjs/common';
import { BaseWsExceptionFilter } from '@nestjs/websockets';
import { STATUS_CODES } from 'http';
import { Socket } from 'socket.io';

@Catch(BadRequestException)
export class ValidationFilter extends BaseWsExceptionFilter {
    catch(exception: HttpException, host: ArgumentsHost) {
        const client: Socket = host.switchToWs().getClient();

        client.emit(
            'exception',
            `${STATUS_CODES[exception.getStatus()]}: ${JSON.stringify(exception.getResponse())}`,
        );
    }
}
